# 統合ダッシュボード実装

## 概要

Chrome拡張機能からのデータも同じUIでタブ切り替え等で表示できるように、DashboardPageを拡張した実装です。

## 実装内容

### 1. 新しいフック: `useExtensionData`
- **ファイル**: `apps/desktop/src/hooks/useExtensionData.ts`
- **機能**: Chrome拡張機能のブラウジングデータを取得・処理
- **データソース**: `browsing_sessions`テーブル
- **処理内容**:
  - 時系列データの生成
  - トップドメインの計算
  - カテゴリ別の分割（waste/productive）

### 2. 統合ダッシュボードページ: `UnifiedDashboardPage`
- **ファイル**: `apps/desktop/src/pages/UnifiedDashboardPage.tsx`
- **機能**: デスクトップアプリとChrome拡張機能のデータをタブで切り替え表示
- **UI要素**:
  - データソース切り替えタブ
  - データソース情報表示
  - 統合されたダッシュボード表示

### 3. ルーティング更新
- **ファイル**: `apps/desktop/src/App.tsx`
- **変更**: メインダッシュボードを`UnifiedDashboardPage`に変更
- **ルート**:
  - `/` → `UnifiedDashboardPage`
  - `/dashboard` → `UnifiedDashboardPage`
  - `/dashboard/desktop` → `DashboardPage` (従来のデスクトップアプリのみ)

## データフロー

### デスクトップアプリデータ
```
useLocalDbData → sessions テーブル → アプリケーション使用状況
```

### Chrome拡張機能データ
```
useExtensionData → browsing_sessions テーブル → ブラウジング活動
```

## 使用方法

1. アプリケーションを起動
2. メインダッシュボードで「デスクトップアプリ」または「Chrome拡張機能」タブを選択
3. 各タブで対応するデータソースの情報を確認

## 技術詳細

### データソース切り替え
- `dataSource` state で現在のデータソースを管理
- `currentData` で選択されたデータソースのデータを取得
- タブクリックで `handleDataSourceChange` を呼び出し

### データ統合
- 両方のデータソースで同じ `DashboardPage` コンポーネントを使用
- データの形式を統一（`TimeSeriesPoint`, `TopItem` など）
- エラーハンドリングとローディング状態の管理

## 今後の拡張可能性

1. **データソースの追加**: 他のアプリケーションやデバイスからのデータ
2. **データの統合表示**: 複数のデータソースを同時に表示
3. **カスタマイズ**: ユーザーが表示するデータソースを選択可能
4. **比較機能**: 異なるデータソース間の比較表示
