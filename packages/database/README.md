# @wasteday/database

浪費時間可視化アプリケーション用のデータベースパッケージです。Supabaseを使用してPostgreSQLデータベースを管理します。

## 機能

- Supabaseクライアントの設定と管理
- 開発・本番・テスト環境の設定分離
- TypeScript型定義
- データベースマイグレーション
- 要件定義に基づくスキーマ設計

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`env.example`をコピーして`.env`ファイルを作成し、必要な値を設定してください。

```bash
cp env.example .env
```

### 3. Supabaseの起動（開発環境）

```bash
# Supabaseローカル環境の起動
npm run start

# データベースのマイグレーション実行
npm run migrate
```

### 4. 型定義の生成

```bash
npm run generate-types
```

## 使用方法

### 基本的な使用方法

```typescript
import { supabase, WasteCategory, CreateSessionData } from '@wasteday/database';

// セッションの作成
const sessionData: CreateSessionData = {
  session_key: 'app:steam.exe:active',
  start_time: '2024-01-01T10:00:00Z',
  end_time: '2024-01-01T10:05:00Z',
  duration_seconds: 300,
  is_idle: false,
  is_media_playing: false
};

const { data, error } = await supabase
  .from('sessions')
  .insert(sessionData);

// 浪費カテゴリの取得
const { data: categories } = await supabase
  .from('waste_categories')
  .select('*')
  .eq('is_active', true);
```

### マイグレーションの実行

```typescript
import { runMigrations } from '@wasteday/database';

// マイグレーションの実行
await runMigrations();
```

### 環境設定

```typescript
import { databaseConfig, appConfig } from '@wasteday/database';

console.log('Database URL:', databaseConfig.url);
console.log('Environment:', appConfig.nodeEnv);
```

## データベーススキーマ

### 主要テーブル

- **waste_categories**: 浪費カテゴリの定義
- **sessions**: アプリ/ドメインの使用セッション記録
- **exclusion_rules**: 除外ルール
- **user_settings**: ユーザー設定
- **daily_summaries**: 日次集計データ
- **weekly_summaries**: 週次集計データ
- **notification_logs**: 通知ログ

### 初期データ

パッケージには以下の初期データが含まれています：

- デフォルトの浪費カテゴリ（YouTube、X、TikTok、Steam等）
- デフォルトのユーザー設定（サンプリング間隔、目標時間等）

## 開発

### ビルド

```bash
npm run build
```

### 開発モード

```bash
npm run dev
```

### テスト

```bash
npm test
```

## 環境別設定

### 開発環境

- Supabaseローカルインスタンスを使用
- デバッグログ有効
- ホットリロード対応

### 本番環境

- 本番Supabaseプロジェクトを使用
- 環境変数による設定
- セキュリティ強化

### テスト環境

- テスト専用データベース
- 短いサンプリング間隔
- 通知無効

## トラブルシューティング

### 接続エラー

1. Supabaseが起動しているか確認
2. 環境変数が正しく設定されているか確認
3. ファイアウォール設定を確認

### マイグレーションエラー

1. データベースの状態を確認
2. マイグレーション履歴を確認
3. 必要に応じてマイグレーションをリセット

```bash
npm run reset
```

## ライセンス

MIT
