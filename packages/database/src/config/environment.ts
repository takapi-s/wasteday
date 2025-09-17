// 環境設定管理
import dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config();

export interface DatabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  databaseUrl: string;
}

export interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

// 環境変数の検証
function validateEnvironment(): void {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file or environment configuration.'
    );
  }
}

// 環境変数を検証
validateEnvironment();

// データベース設定
export const databaseConfig: DatabaseConfig = {
  url: process.env.SUPABASE_URL!,
  anonKey: process.env.SUPABASE_ANON_KEY!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  databaseUrl: process.env.DATABASE_URL!,
};

// アプリケーション設定
export const appConfig: AppConfig = {
  nodeEnv: (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
};

// 開発環境用の設定
export const isLocalDevelopment = appConfig.isDevelopment && 
  databaseConfig.url.includes('localhost');

// 設定の検証
export function validateConfig(): void {
  if (appConfig.isProduction && isLocalDevelopment) {
    throw new Error('Production environment cannot use localhost URLs');
  }
  
  if (appConfig.isDevelopment && !isLocalDevelopment) {
    console.warn('Warning: Development environment is using non-localhost URLs');
  }
}

// 設定を検証
validateConfig();
