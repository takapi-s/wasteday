# @wasteday/ui

WasteDayプロジェクトの共有UIコンポーネントライブラリです。

## 概要

このパッケージは、デスクトップアプリケーションとWebアプリケーションの両方で使用できる再利用可能なReactコンポーネントを提供します。

## コンポーネント

### Layout
アプリケーションの基本的なレイアウト構造を提供します。サイドバーナビゲーションとメインコンテンツエリアを含みます。

### DataPage
データ表示用のページコンポーネントです。現在の状態、イベント、サンプル、保留中の挿入を表示します。

### SettingsPage
設定ページ用のコンポーネントです。自動起動設定、アイドル閾値、ギャップ閾値の設定が可能です。

## 使用方法

```tsx
import { Layout, DataPage, SettingsPage } from '@wasteday/ui';

// レイアウトの使用
<Layout title="My App">
  <Outlet />
</Layout>

// データページの使用
<DataPage
  currentInfo={currentInfo}
  events={events}
  samples={samples}
  // ... その他のプロパティ
/>

// 設定ページの使用
<SettingsPage
  autostartEnabled={autostartEnabled}
  onToggleAutostart={handleToggle}
  onSaveSettings={handleSave}
/>
```

## 開発

```bash
# ビルド
npm run build

# 開発モード（ウォッチ）
npm run dev
```

## 依存関係

- React 18.2.0+
- React Router DOM 6.20.1+
- Tailwind CSS（スタイリング用）

