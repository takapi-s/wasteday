import { invoke } from "@tauri-apps/api/core";
import { IngestService, type SampleEvent, type IngestOptions } from "@wasteday/ingest";

type ForegroundInfo = {
  process_id: number;
  exe: string;
  window_title: string;
};

type SamplingConfig = {
  samplingIntervalMs: number;
  idleGapThresholdSeconds: number;
  idleThresholdSeconds: number;
};

export type SamplingEvent = {
  type: 'sample' | 'session_started' | 'session_updated' | 'session_ended';
  data: any;
  timestamp: string;
};

export class SamplingService {
  private ingest: IngestService;
  private config: SamplingConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private listeners: Array<(event: SamplingEvent) => void> = [];
  private lastSampleTime = 0;
  private errorCount = 0;
  private maxRetries = 3;

  constructor(config?: Partial<SamplingConfig>) {
    // Load gap threshold from localStorage
    const savedGapThreshold = localStorage.getItem('wasteday-gap-threshold');
    const gapThreshold = savedGapThreshold ? parseInt(savedGapThreshold, 10) : 20;
    
    this.config = {
      samplingIntervalMs: 5000,
      idleGapThresholdSeconds: gapThreshold,
      idleThresholdSeconds: 60,
      ...config,
    };

    const ingestOptions: IngestOptions = {
      samplingIntervalMs: this.config.samplingIntervalMs,
      idleGapThresholdSeconds: this.config.idleGapThresholdSeconds,
      sessionSwitchGracePeriodSeconds: 5, // アプリ切り替え時の猶予期間（秒）- サンプリング間隔と同じ
    };
    
    this.ingest = new IngestService(ingestOptions);

    this.setupIngestListeners();
    this.setupVisibilityHandlers();
  }

  private setupIngestListeners() {
    this.ingest.onEvent((e) => {
      const event: SamplingEvent = {
        type: e.type as any,
        data: e,
        timestamp: new Date().toISOString(),
      };
      this.emit(event);
    });
  }

  public getPendingInserts(): Map<string, any> {
    return this.ingest.getPendingInserts();
  }

  private setupVisibilityHandlers() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          console.log('[SamplingService] アプリがバックグラウンドに移行');
          this.handleBackgroundMode();
        } else {
          console.log('[SamplingService] アプリがフォアグラウンドに復帰');
          this.handleForegroundMode();
        }
      });
    }
  }

  private handleBackgroundMode() {
    // バックグラウンド時はサンプリング間隔を延長
    if (this.isRunning && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this.sampleWithRetry(), this.config.samplingIntervalMs * 2);
    }
  }

  private handleForegroundMode() {
    // フォアグラウンド復帰時は即座にサンプリング実行
    if (this.isRunning) {
      this.sampleWithRetry();
      // 通常の間隔に戻す
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = setInterval(() => this.sampleWithRetry(), this.config.samplingIntervalMs);
      }
    }
  }

  private async sampleWithRetry(retryCount = 0): Promise<void> {
    try {
      await this.performSample();
      this.errorCount = 0; // 成功時はエラーカウントをリセット
    } catch (error) {
      this.errorCount++;
      console.error(`[SamplingService] サンプリング失敗 (試行${retryCount + 1}/${this.maxRetries}):`, error);
      
      if (retryCount < this.maxRetries - 1) {
        // 指数バックオフで再試行
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        setTimeout(() => this.sampleWithRetry(retryCount + 1), delay);
      } else {
        console.error('[SamplingService] 最大再試行回数に達しました');
      }
    }
  }

  private async performSample(): Promise<void> {
    const info = await invoke<ForegroundInfo>("get_foreground_info");
    const idleSec = await invoke<number>("get_idle_seconds");
    const user_state: 'active' | 'idle' = idleSec >= this.config.idleThresholdSeconds ? 'idle' : 'active';
    
    const sample: SampleEvent = {
      timestamp: new Date().toISOString(),
      category: 'app',
      identifier: (info.exe || 'unknown.exe').toLowerCase(),
      window_title: info.window_title,
      user_state,
    };

    console.log('[SamplingService] サンプル実行:', { info, idleSec, user_state, sample });
    this.ingest.handleSample(sample);
    this.lastSampleTime = Date.now();

    const event: SamplingEvent = {
      type: 'sample',
      data: { ...info, user_state, idle_sec: idleSec, identifier: sample.identifier },
      timestamp: sample.timestamp,
    };
    this.emit(event);
  }

  public start(): void {
    if (this.isRunning) {
      console.warn('[SamplingService] 既に実行中です');
      return;
    }

    console.log('[SamplingService] サンプリングを開始');
    this.isRunning = true;
    this.intervalId = setInterval(() => this.sampleWithRetry(), this.config.samplingIntervalMs);
    
    // 即座に最初のサンプリングを実行
    this.sampleWithRetry();
  }

  public stop(): void {
    if (!this.isRunning) {
      console.warn('[SamplingService] 既に停止中です');
      return;
    }

    console.log('[SamplingService] サンプリングを停止');
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // 開いているセッションをすべて終了
    this.ingest.flushAll();
  }

  public onEvent(listener: (event: SamplingEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit(event: SamplingEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[SamplingService] イベントリスナーでエラー:', error);
      }
    });
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      lastSampleTime: this.lastSampleTime,
      errorCount: this.errorCount,
      config: this.config,
    };
  }

  public updateConfig(newConfig: Partial<SamplingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // IngestServiceのインスタンスも更新
    this.ingest = new IngestService({
      samplingIntervalMs: this.config.samplingIntervalMs,
      idleGapThresholdSeconds: this.config.idleGapThresholdSeconds,
      sessionSwitchGracePeriodSeconds: 5, // サンプリング間隔と同じ
    });
    this.setupIngestListeners();
    
    // 実行中の場合、新しい設定で再開
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

// シングルトンインスタンス
let samplingServiceInstance: SamplingService | null = null;

export const getSamplingService = (config?: Partial<SamplingConfig>): SamplingService => {
  if (!samplingServiceInstance) {
    samplingServiceInstance = new SamplingService(config);
  }
  return samplingServiceInstance;
};
