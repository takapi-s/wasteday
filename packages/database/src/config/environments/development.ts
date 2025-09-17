// 開発環境設定
import { DatabaseConfig, AppConfig } from '../environment';

export const developmentConfig: DatabaseConfig & AppConfig = {
  // データベース設定
  url: 'http://localhost:54326',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0',
  serviceRoleKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  databaseUrl: 'postgresql://postgres:postgres@localhost:54324/postgres',
  
  // アプリケーション設定
  nodeEnv: 'development',
  isDevelopment: true,
  isProduction: false,
  isTest: false,
};

// 開発環境用のデフォルト設定
export const defaultDevelopmentSettings = {
  sampling_interval: 5, // 5秒
  idle_threshold: 60, // 60秒
  goal_weekday: 3600, // 60分
  goal_weekend: 5400, // 90分
  notifications_enabled: true,
  goal_exceeded_notification: true,
  continuous_viewing_notification: true,
  continuous_viewing_threshold: 1800, // 30分
};
