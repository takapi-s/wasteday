-- 初期スキーマのマイグレーション
-- このファイルは schema.sql と同じ内容ですが、マイグレーション管理用です

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 浪費カテゴリテーブル
CREATE TABLE IF NOT EXISTS waste_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('app', 'domain')),
    identifier VARCHAR(255) NOT NULL,
    label VARCHAR(20) NOT NULL DEFAULT 'waste' CHECK (label IN ('waste', 'neutral', 'study')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(type, identifier)
);

-- 除外ルールテーブル
CREATE TABLE IF NOT EXISTS exclusion_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES waste_categories(id) ON DELETE CASCADE,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('path', 'query', 'channel_id', 'regex')),
    pattern TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- セッションテーブル
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES waste_categories(id) ON DELETE SET NULL,
    session_key VARCHAR(500) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER NOT NULL,
    is_idle BOOLEAN NOT NULL DEFAULT false,
    is_media_playing BOOLEAN NOT NULL DEFAULT false,
    window_title TEXT,
    url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_sessions_category_id ON sessions(category_id);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(DATE(start_time));

-- ユーザー設定テーブル
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 日次集計テーブル
CREATE TABLE IF NOT EXISTS daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    total_waste_seconds INTEGER NOT NULL DEFAULT 0,
    total_active_seconds INTEGER NOT NULL DEFAULT 0,
    waste_ratio_active DECIMAL(5,2) NOT NULL DEFAULT 0,
    waste_ratio_24h DECIMAL(5,2) NOT NULL DEFAULT 0,
    goal_seconds INTEGER NOT NULL DEFAULT 3600,
    goal_achieved BOOLEAN NOT NULL DEFAULT false,
    top_categories JSONB,
    hourly_breakdown JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries(date);

-- 週次集計テーブル
CREATE TABLE IF NOT EXISTS weekly_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start_date DATE NOT NULL UNIQUE,
    total_waste_seconds INTEGER NOT NULL DEFAULT 0,
    total_active_seconds INTEGER NOT NULL DEFAULT 0,
    average_daily_waste_seconds INTEGER NOT NULL DEFAULT 0,
    waste_ratio_active DECIMAL(5,2) NOT NULL DEFAULT 0,
    waste_ratio_24h DECIMAL(5,2) NOT NULL DEFAULT 0,
    goal_achieved_days INTEGER NOT NULL DEFAULT 0,
    top_categories JSONB,
    daily_breakdown JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_summaries_week_start ON weekly_summaries(week_start_date);

-- 通知ログテーブル
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_is_read ON notification_logs(is_read);

-- 更新日時の自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルに更新日時トリガーを設定
DROP TRIGGER IF EXISTS update_waste_categories_updated_at ON waste_categories;
CREATE TRIGGER update_waste_categories_updated_at BEFORE UPDATE ON waste_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exclusion_rules_updated_at ON exclusion_rules;
CREATE TRIGGER update_exclusion_rules_updated_at BEFORE UPDATE ON exclusion_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_summaries_updated_at ON daily_summaries;
CREATE TRIGGER update_daily_summaries_updated_at BEFORE UPDATE ON daily_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_weekly_summaries_updated_at ON weekly_summaries;
CREATE TRIGGER update_weekly_summaries_updated_at BEFORE UPDATE ON weekly_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
