// メインエクスポートファイル
// データベースパッケージの全機能をエクスポート

// クライアント
export { supabase, supabaseAdmin, testConnection, testAdminConnection } from './client/supabase';

// 設定
export { databaseConfig, appConfig, isLocalDevelopment, validateConfig } from './config/environment';
export { developmentConfig, defaultDevelopmentSettings } from './config/environments/development';
export { productionConfig, defaultProductionSettings, validateProductionConfig } from './config/environments/production';
export { testConfig, defaultTestSettings } from './config/environments/test';

// 型定義
export * from './types/database';
export type { Database } from './types/supabase';

// マイグレーション
export { runMigrations, resetMigrations } from './migrations/migrate';

// バージョン情報
export const VERSION = '0.1.0';
export const PACKAGE_NAME = '@wasteday/database';
