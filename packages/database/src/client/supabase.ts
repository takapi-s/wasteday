// Supabaseクライアント設定
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';
import { databaseConfig, appConfig } from '../config/environment';

// Supabaseクライアントの作成
export const supabase = createClient<Database>(
  databaseConfig.url,
  databaseConfig.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'wasteday-database@0.1.0'
      }
    }
  }
);

// 管理者権限用のクライアント（サービスロールキー使用）
export const supabaseAdmin = createClient<Database>(
  databaseConfig.url,
  databaseConfig.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'X-Client-Info': 'wasteday-database-admin@0.1.0'
      }
    }
  }
);

// 接続テスト
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('waste_categories')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
    
    console.log('Database connection test successful');
    return true;
  } catch (error) {
    console.error('Database connection test error:', error);
    return false;
  }
}

// 管理者接続テスト
export async function testAdminConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('waste_categories')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Admin database connection test failed:', error);
      return false;
    }
    
    console.log('Admin database connection test successful');
    return true;
  } catch (error) {
    console.error('Admin database connection test error:', error);
    return false;
  }
}

// 開発環境での初期化
if (appConfig.isDevelopment) {
  console.log('Development mode: Supabase client initialized');
  console.log('Supabase URL:', databaseConfig.url);
}
