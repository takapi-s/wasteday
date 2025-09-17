// マイグレーション実行スクリプト
import { readFileSync } from 'fs';
import { join } from 'path';
import { supabaseAdmin } from '../client/supabase';

interface Migration {
  version: string;
  filename: string;
  sql: string;
}

// マイグレーションファイルの読み込み
function loadMigrations(): Migration[] {
  const migrationsDir = join(__dirname);
  const migrations: Migration[] = [];
  
  // マイグレーションファイルのリスト
  const migrationFiles = [
    '001_initial_schema.sql',
    '002_initial_data.sql',
    '003_rls_policies.sql'
  ];
  
  for (const filename of migrationFiles) {
    const filePath = join(migrationsDir, filename);
    const sql = readFileSync(filePath, 'utf-8');
    const version = filename.split('_')[0];
    
    migrations.push({
      version,
      filename,
      sql
    });
  }
  
  return migrations;
}

// マイグレーション履歴テーブルの作成
async function createMigrationsTable(): Promise<void> {
  const { error } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS migrations (
        version VARCHAR(20) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  });
  
  if (error) {
    console.error('Failed to create migrations table:', error);
    throw error;
  }
}

// 実行済みマイグレーションの取得
async function getExecutedMigrations(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from('migrations')
    .select('version');
  
  if (error) {
    console.error('Failed to get executed migrations:', error);
    throw error;
  }
  
  return data?.map(m => m.version) || [];
}

// マイグレーションの実行
async function executeMigration(migration: Migration): Promise<void> {
  console.log(`Executing migration ${migration.version}: ${migration.filename}`);
  
  // SQLを分割して実行（Supabaseの制限を回避）
  const statements = migration.sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  for (const statement of statements) {
    if (statement.trim()) {
      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: statement + ';'
      });
      
      if (error) {
        console.error(`Failed to execute statement: ${statement}`, error);
        throw error;
      }
    }
  }
  
  // マイグレーション履歴に記録
  const { error: insertError } = await supabaseAdmin
    .from('migrations')
    .insert({
      version: migration.version,
      filename: migration.filename
    });
  
  if (insertError) {
    console.error('Failed to record migration:', insertError);
    throw insertError;
  }
  
  console.log(`Migration ${migration.version} completed successfully`);
}

// メインのマイグレーション実行関数
export async function runMigrations(): Promise<void> {
  try {
    console.log('Starting database migrations...');
    
    // マイグレーション履歴テーブルを作成
    await createMigrationsTable();
    
    // マイグレーションファイルを読み込み
    const migrations = loadMigrations();
    
    // 実行済みマイグレーションを取得
    const executedMigrations = await getExecutedMigrations();
    
    // 未実行のマイグレーションを実行
    const pendingMigrations = migrations.filter(
      m => !executedMigrations.includes(m.version)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations`);
    
    for (const migration of pendingMigrations) {
      await executeMigration(migration);
    }
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// マイグレーションのリセット（開発用）
export async function resetMigrations(): Promise<void> {
  try {
    console.log('Resetting migrations...');
    
    const { error } = await supabaseAdmin
      .from('migrations')
      .delete()
      .neq('version', 'dummy'); // 全削除
    
    if (error) {
      console.error('Failed to reset migrations:', error);
      throw error;
    }
    
    console.log('Migrations reset successfully');
  } catch (error) {
    console.error('Migration reset failed:', error);
    throw error;
  }
}

// 直接実行時の処理
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}
