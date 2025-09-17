// 本番環境設定
import { DatabaseConfig, AppConfig } from '../environment';

export const productionConfig: DatabaseConfig & AppConfig = {
  // データベース設定（環境変数から取得）
  url: process.env.SUPABASE_URL || '',
  anonKey: process.env.SUPABASE_ANON_KEY || '',
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  databaseUrl: process.env.DATABASE_URL || '',
  
  // アプリケーション設定
  nodeEnv: 'production',
  isDevelopment: false,
  isProduction: true,
  isTest: false,
};

// 本番環境用のデフォルト設定
export const defaultProductionSettings = {
  sampling_interval: 5, // 5秒
  idle_threshold: 60, // 60秒
  goal_weekday: 3600, // 60分
  goal_weekend: 5400, // 90分
  notifications_enabled: true,
  goal_exceeded_notification: true,
  continuous_viewing_notification: true,
  continuous_viewing_threshold: 1800, // 30分
};

// 本番環境の設定検証
export function validateProductionConfig(): void {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Production environment missing required variables: ${missingVars.join(', ')}`
    );
  }

  // 本番環境ではlocalhostを使用してはいけない
  if (productionConfig.url.includes('localhost')) {
    throw new Error('Production environment cannot use localhost URLs');
  }
}
