// テスト環境設定
import { DatabaseConfig, AppConfig } from '../environment';

export const testConfig: DatabaseConfig & AppConfig = {
  // データベース設定（テスト用）
  url: 'http://localhost:54326',
  anonKey: 'test-anon-key',
  serviceRoleKey: 'test-service-role-key',
  databaseUrl: 'postgresql://postgres:postgres@localhost:54324/test_wasteday',
  
  // アプリケーション設定
  nodeEnv: 'test',
  isDevelopment: false,
  isProduction: false,
  isTest: true,
};

// テスト環境用のデフォルト設定
export const defaultTestSettings = {
  sampling_interval: 1, // テスト用に短い間隔
  idle_threshold: 10, // テスト用に短い閾値
  goal_weekday: 60, // テスト用に短い目標時間
  goal_weekend: 90,
  notifications_enabled: false, // テストでは通知を無効
  goal_exceeded_notification: false,
  continuous_viewing_notification: false,
  continuous_viewing_threshold: 30, // テスト用に短い閾値
};
