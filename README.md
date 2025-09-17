# Wasteday - 無駄時間可視化アプリケーション

PC上の「浪費時間（SNS・動画・ゲーム等）」を自動で記録・集計し、当日どの程度"無駄にしたか"を一目で把握できるアプリケーションです。

## 概要

このアプリケーションは、要件定義に基づいて以下の機能を提供します：

- アプリ別・ブラウザドメイン別の使用時間自動記録
- 浪費時間の可視化と分析
- 目標時間設定と通知機能
- 週次・日次の統計データ表示
- 除外ルールによる学習時間の保護

## 技術スタック

- **フロントエンド**: React + TypeScript + Tailwind CSS
- **バックエンド**: Supabase (PostgreSQL)
- **デスクトップアプリ**: Tauri (Rust + React)
- **ブラウザ拡張**: Chrome/Edge Extension (Manifest V3)
- **言語**: TypeScript (全プロジェクト共通)

## プロジェクト構造

```
wasteday/
├── packages/           # 共有パッケージ
│   └── database/      # データベース管理パッケージ
├── apps/              # アプリケーション
│   ├── desktop/       # デスクトップアプリ (Tauri)
│   ├── web/           # Webアプリケーション
│   └── extension/     # ブラウザ拡張
├── docs/              # ドキュメント
└── README.md
```

## セットアップ

### 前提条件

- Node.js 18以上
- Rust (Tauri用)
- Supabase CLI

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd wasteday
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. データベースのセットアップ

```bash
# Supabaseローカル環境の起動
npm run db:start

# データベースのマイグレーション実行
npm run db:migrate
```

### 4. 環境変数の設定

各パッケージの`env.example`をコピーして`.env`ファイルを作成し、必要な値を設定してください。

## 開発

### 開発サーバーの起動

```bash
# 全パッケージの開発サーバーを起動
npm run dev

# 個別パッケージの開発
cd packages/database && npm run dev
cd apps/desktop && npm run dev
```

### ビルド

```bash
# 全パッケージのビルド
npm run build

# 個別パッケージのビルド
cd packages/database && npm run build
```

### テスト

```bash
# 全パッケージのテスト実行
npm run test
```

## データベース管理

### マイグレーション

```bash
# マイグレーションの実行
npm run db:migrate

# マイグレーションのリセット（開発用）
npm run db:reset
```

### Supabase管理

```bash
# Supabaseの起動
npm run db:start

# Supabaseの停止
npm run db:stop
```

## 主要機能

### 1. 自動時間記録

- Windows APIを使用したアプリ前面情報の取得
- ブラウザ拡張によるドメイン別URL監視
- 5秒間隔でのサンプリング（設定可能）

### 2. 浪費時間の判定

- アプリ・ドメイン別のカテゴリ分類
- 除外ルールによる学習時間の保護
- 動画・音声再生中の特別処理

### 3. 可視化

- 日次・週次の統計表示
- 時間帯別ヒートマップ
- 目標達成率の表示
- 上位カテゴリのランキング

### 4. 通知機能

- 目標時間超過時の通知
- 連続視聴時間の警告
- カスタマイズ可能な通知設定

## 設定

### デフォルト設定

- サンプリング間隔: 5秒
- アイドル閾値: 60秒
- 平日目標時間: 60分
- 休日目標時間: 90分

### 初期浪費カテゴリ

**ドメイン:**
- youtube.com
- x.com
- tiktok.com
- instagram.com
- reddit.com

**アプリ:**
- steam.exe
- LeagueClient.exe
- VALORANT.exe
- discord.exe

## ライセンス

MIT

## 貢献

プロジェクトへの貢献を歓迎します。詳細は[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。
