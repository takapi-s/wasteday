import type { TimeSeriesPoint, TopItem } from '@wasteday/ui';
import type { QueryOptions, LocalSession, ExtensionSession, Category, ProcessedData } from '../types/dashboard';

/**
 * データ処理の共通ユーティリティ
 */
export class DataProcessor {
  private static readonly CACHE_DURATION = 30000; // 30秒
  private static cache = new Map<string, { data: any; timestamp: number }>();

  /**
   * キャッシュからデータを取得
   */
  static getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  /**
   * データをキャッシュに保存
   */
  static setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * キャッシュキーを生成
   */
  static generateCacheKey(options: QueryOptions, dataType: string): string {
    return `${dataType}_${options.rangeHours}_${options.binMinutes}`;
  }

  /**
   * 時系列データを生成（最適化版）
   */
  static generateTimeSeries(
    sessions: (LocalSession | ExtensionSession)[],
    categories: Category[],
    rangeHours: number,
    binMinutes: number
  ): TimeSeriesPoint[] {
    const now = new Date();
    const startTime = new Date(now.getTime() - rangeHours * 60 * 60 * 1000);
    const binSeconds = binMinutes * 60;
    const totalBins = Math.ceil((rangeHours * 60 * 60) / binSeconds);

    // 事前に配列を初期化（Mapより高速）
    // activeBins: waste seconds, idleBins: productive seconds (waste以外)
    const activeBins = new Array(totalBins).fill(0);
    const idleBins = new Array(totalBins).fill(0);

    // カテゴリのidentifier→labelマップ
    const identifierToCategory = new Map<string, string>();
    for (const category of categories) {
      if (category.identifier) {
        identifierToCategory.set(category.identifier, category.label);
      }
    }

    // セッションを時間順にソート（オプション）
    const sortedSessions = sessions
      .filter(session => new Date(session.start_time).getTime() >= startTime.getTime())
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    for (const session of sortedSessions) {
      const sessionStart = new Date(session.start_time);
      const sessionEnd = new Date(sessionStart.getTime() + session.duration_seconds * 1000);
      
      // セッションが範囲内にあるかチェック
      if (sessionStart >= startTime && sessionStart < now) {
        const startBin = Math.floor((sessionStart.getTime() - startTime.getTime()) / (binSeconds * 1000));
        const endBin = Math.floor((sessionEnd.getTime() - startTime.getTime()) / (binSeconds * 1000));
        
        // セッションが複数のビンにまたがる場合の処理
        for (let binIndex = Math.max(0, startBin); binIndex <= Math.min(totalBins - 1, endBin); binIndex++) {
          const binStart = new Date(startTime.getTime() + binIndex * binSeconds * 1000);
          const binEnd = new Date(binStart.getTime() + binSeconds * 1000);
          
          // 重複部分の計算
          const overlapStart = new Date(Math.max(sessionStart.getTime(), binStart.getTime()));
          const overlapEnd = new Date(Math.min(sessionEnd.getTime(), binEnd.getTime()));
          const overlapSeconds = Math.max(0, Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 1000));
          
          if (overlapSeconds > 0) {
            // セッションの識別子を抽出
            let identifier = '';
            if ('domain' in session) {
              identifier = session.domain;
            } else {
              const keyParts = session.session_key.split(';');
              const identifierPart = keyParts.find(part => part.startsWith('identifier='));
              identifier = identifierPart ? identifierPart.split('=')[1] : '';
            }

            const label = identifier ? identifierToCategory.get(identifier) : undefined;
            const isWaste = label === 'waste';

            if (isWaste) {
              activeBins[binIndex] += overlapSeconds;
            } else {
              idleBins[binIndex] += overlapSeconds;
            }
          }
        }
      }
    }

    // 時系列データを生成
    const series: TimeSeriesPoint[] = [];
    for (let i = 0; i < totalBins; i++) {
      const timestamp = new Date(startTime.getTime() + i * binSeconds * 1000);
      series.push({
        timestamp: timestamp.toISOString(),
        activeSeconds: activeBins[i],
        idleSeconds: idleBins[i],
      });
    }

    return series;
  }

  /**
   * トップアイテムを生成（最適化版）
   */
  static generateTopItems(
    sessions: (LocalSession | ExtensionSession)[],
    categories: Category[],
    type: 'identifiers' | 'waste' | 'productive'
  ): TopItem[] {
    // カテゴリマップを事前に構築（O(1)ルックアップ用）
    const categoryMap = new Map<string, string>();
    const identifierToCategory = new Map<string, string>();
    
    for (const category of categories) {
      if (category.id) {
        categoryMap.set(category.id.toString(), category.label);
      }
      if (category.identifier) {
        identifierToCategory.set(category.identifier, category.label);
      }
    }

    // 統計を収集（単一ループで最適化）
    const stats = new Map<string, { totalTime: number; count: number; category?: string }>();

    for (const session of sessions) {
      let identifier: string;
      
      if ('domain' in session) {
        // Extension session
        identifier = session.domain;
      } else {
        // Local session - session_keyからidentifierを抽出
        const keyParts = session.session_key.split(';');
        const identifierPart = keyParts.find(part => part.startsWith('identifier='));
        identifier = identifierPart ? identifierPart.split('=')[1] : session.session_key;
      }

      if (!identifier) continue;

      const existing = stats.get(identifier);
      if (existing) {
        existing.totalTime += session.duration_seconds;
        existing.count += 1;
      } else {
        const category = identifierToCategory.get(identifier);
        stats.set(identifier, {
          totalTime: session.duration_seconds,
          count: 1,
          category,
        });
      }
    }

    // フィルタリングとソートを一度に実行
    let filteredStats = Array.from(stats.entries());
    
    if (type === 'waste') {
      filteredStats = filteredStats.filter(([_, data]) => data.category === 'waste');
    } else if (type === 'productive') {
      // waste 以外（productive/neutral/未分類）を productive とみなす
      filteredStats = filteredStats.filter(([_, data]) => data.category !== 'waste');
    }

    return filteredStats
      .map(([identifier, data]) => ({
        label: identifier,
        seconds: data.totalTime,
      }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 10);
  }

  /**
   * 今日の統計を計算（最適化版）
   */
  static calculateTodayStats(
    sessions: (LocalSession | ExtensionSession)[],
    categories: Category[]
  ): {
    todayActiveSeconds: number;
    todayIdleSeconds: number;
    sessionsCount: number;
  } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let todayActiveSeconds = 0; // Waste seconds
    let todayIdleSeconds = 0;   // Productive seconds (waste以外)
    let sessionsCount = 0;

    // カテゴリのidentifier→labelマップを作成
    const identifierToCategory = new Map<string, string>();
    for (const category of categories) {
      if (category.identifier) {
        identifierToCategory.set(category.identifier, category.label);
      }
    }

    // セッションを時間順にソートして効率的に処理
    const todaySessions = sessions
      .filter(session => {
        const sessionTime = new Date(session.start_time);
        return sessionTime >= today && sessionTime < tomorrow;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    for (const session of todaySessions) {
      let identifier = '';
      if ('domain' in session) {
        identifier = session.domain;
      } else {
        const keyParts = session.session_key.split(';');
        const identifierPart = keyParts.find(part => part.startsWith('identifier='));
        identifier = identifierPart ? identifierPart.split('=')[1] : '';
      }

      const label = identifier ? identifierToCategory.get(identifier) : undefined;
      const isWaste = label === 'waste';

      if (isWaste) {
        todayActiveSeconds += session.duration_seconds;
      } else {
        // waste以外（productive/neutral/未分類）はproductiveとして計上
        todayIdleSeconds += session.duration_seconds;
      }
      sessionsCount += 1;
    }

    return {
      todayActiveSeconds,
      todayIdleSeconds,
      sessionsCount,
    };
  }

  /**
   * データ処理の最適化（単一ループで複数の処理を実行）
   */
  static processDataOptimized(
    sessions: (LocalSession | ExtensionSession)[],
    categories: Category[],
    rangeHours: number,
    binMinutes: number
  ): ProcessedData {
    // 未使用パラメータ抑制
    void rangeHours;
    const binSeconds = binMinutes * 60;
    const bins = new Map<number, number>();
    const domainStats = new Map<string, { totalTime: number; count: number; categoryId?: number }>();
    const categoryMap = new Map<number, string>();

    // カテゴリマップを構築
    for (const category of categories) {
      if (category.id) {
        categoryMap.set(category.id, category.label);
      }
    }

    // 単一ループで複数の処理を実行
    for (const session of sessions) {
      const sessionTime = new Date(session.start_time).getTime();
      const binIndex = Math.floor(sessionTime / (binSeconds * 1000));
      
      // 時系列データの生成
      bins.set(binIndex, (bins.get(binIndex) || 0) + session.duration_seconds);
      
      // ドメイン統計の計算
      let identifier: string;
      if ('domain' in session) {
        identifier = session.domain;
      } else {
        identifier = session.session_key;
      }

      const existing = domainStats.get(identifier);
      if (existing) {
        existing.totalTime += session.duration_seconds;
        existing.count += 1;
      } else {
        domainStats.set(identifier, {
          totalTime: session.duration_seconds,
          count: 1,
          categoryId: 'category_id' in session ? session.category_id : undefined,
        });
      }
    }

    return {
      bins,
      domainStats,
      categoryMap,
    };
  }
}
