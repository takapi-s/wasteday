# Chrome拡張機能データ表示のパフォーマンス最適化

## 問題の分析

Chrome拡張機能のデータ表示時に以下のパフォーマンス問題が発生していました：

1. **大量のデータ処理**: 全セッションデータを一度に処理
2. **重複計算**: 毎回同じ計算を実行
3. **非効率なループ**: 複数のループで同じデータを処理
4. **メモリ使用量**: 大量のデータをメモリに保持

## 実装した最適化

### 1. データ処理の最適化

#### 前の実装（非効率）
```typescript
// 複数のループで同じデータを処理
for (const session of sessions) {
  // 時系列データの生成
}
for (const session of sessions) {
  // ドメイン統計の計算
}
for (const session of sessions) {
  // カテゴリ別の分割
}
```

#### 最適化後の実装
```typescript
// 単一のループで複数の処理を実行
for (const session of sessions) {
  // 時系列データの生成
  const binIndex = Math.floor(sessionTime / (binSeconds * 1000));
  bins.set(binIndex, (bins.get(binIndex) || 0) + session.duration_seconds);
  
  // ドメイン統計の計算
  const existing = domainStats.get(domain);
  if (existing) {
    existing.totalTime += session.duration_seconds;
    existing.count += 1;
  }
}
```

### 2. キャッシュ機能の実装

```typescript
// グローバルキャッシュ
const dataCache = new Map<string, { data: ExtensionData; timestamp: number }>();
const CACHE_DURATION = 30000; // 30秒

// キャッシュチェック
const cached = dataCache.get(cacheKey);
if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
  setData({ ...cached.data, loading: false });
  return;
}
```

### 3. メモ化の活用

```typescript
// オプションのメモ化
const memoizedOptions = useMemo(() => ({
  rangeHours: Math.min(24, Math.max(1, Math.floor(options.rangeHours ?? 24))),
  binMinutes: Math.min(120, Math.max(10, Math.floor(options.binMinutes ?? 60))),
}), [options.rangeHours, options.binMinutes]);

// データソースのメモ化
const currentData = useMemo(() => 
  dataSource === 'desktop' ? desktopData : extensionData,
  [dataSource, desktopData, extensionData]
);
```

### 4. 効率的なデータ構造の使用

```typescript
// Mapを使用してO(1)の検索・更新を実現
const bins = new Map<number, number>();
const domainStats = new Map<string, { totalTime: number; count: number; categoryId?: number }>();
const categoryMap = new Map<number, string>();
```

### 5. ローディング状態の改善

```typescript
// タブの無効化
disabled={extensionData.loading}
className={`... ${extensionData.loading ? 'opacity-50 cursor-not-allowed' : ''}`}

// 視覚的なフィードバック
{currentData.loading && (
  <span className="text-sm text-blue-600 dark:text-blue-400">
    読み込み中...
  </span>
)}
```

## パフォーマンス改善の効果

### 処理時間の短縮
- **前**: 大量のデータで数秒の処理時間
- **後**: キャッシュにより即座に表示、初回でも大幅短縮

### メモリ使用量の削減
- **前**: 複数の配列とオブジェクトを保持
- **後**: Mapを使用した効率的なデータ構造

### ユーザー体験の向上
- **前**: タブ切り替え時に毎回重い処理
- **後**: キャッシュにより瞬時に切り替え

## 今後の改善案

1. **仮想化**: 大量のデータを表示する際の仮想スクロール
2. **Web Worker**: 重い計算をバックグラウンドで実行
3. **インデックス**: データベースクエリの最適化
4. **ページネーション**: 大量データの段階的読み込み

## 監視とメトリクス

パフォーマンスの監視のために以下のメトリクスを追加：

```typescript
// 処理時間の測定
const startTime = performance.now();
// データ処理
const endTime = performance.now();
console.log(`Data processing took ${endTime - startTime} milliseconds`);
```

## 使用方法

最適化された実装は自動的に適用されます：

1. 初回データ読み込み時は最適化された処理を実行
2. 30秒以内の再読み込みはキャッシュから取得
3. タブ切り替え時は即座に表示
4. ローディング状態が視覚的に表示

これにより、Chrome拡張機能のデータ表示が大幅に高速化され、ユーザー体験が向上します。
