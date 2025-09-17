-- 浪費時間可視化アプリケーション データベーススキーマ
-- Supabase用のPostgreSQLスキーマ

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 浪費カテゴリテーブル
CREATE TABLE waste_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('app', 'domain')),
    identifier VARCHAR(255) NOT NULL, -- exe名またはドメイン
    label VARCHAR(20) NOT NULL DEFAULT 'waste' CHECK (label IN ('waste', 'neutral', 'study')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(type, identifier)
);

-- 除外ルールテーブル
CREATE TABLE exclusion_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES waste_categories(id) ON DELETE CASCADE,
    rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('path', 'query', 'channel_id', 'regex')),
    pattern TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- セッションテーブル（アプリ/ドメインの使用記録）
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES waste_categories(id) ON DELETE SET NULL,
    session_key VARCHAR(500) NOT NULL, -- {category, identifier, user_state}
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER NOT NULL,
    is_idle BOOLEAN NOT NULL DEFAULT false,
    is_media_playing BOOLEAN NOT NULL DEFAULT false, -- 動画・音声再生中
    window_title TEXT,
    url TEXT, -- ブラウザの場合
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_sessions_start_time (start_time),
    INDEX idx_sessions_category_id (category_id),
    INDEX idx_sessions_date (DATE(start_time))
);

-- ユーザー設定テーブル
CREATE TABLE user_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 日次集計テーブル
CREATE TABLE daily_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL UNIQUE,
    total_waste_seconds INTEGER NOT NULL DEFAULT 0,
    total_active_seconds INTEGER NOT NULL DEFAULT 0,
    waste_ratio_active DECIMAL(5,2) NOT NULL DEFAULT 0, -- 浪費時間/PCアクティブ時間
    waste_ratio_24h DECIMAL(5,2) NOT NULL DEFAULT 0, -- 浪費時間/24時間
    goal_seconds INTEGER NOT NULL DEFAULT 3600, -- 目標時間（秒）
    goal_achieved BOOLEAN NOT NULL DEFAULT false,
    top_categories JSONB, -- 上位カテゴリのJSON配列
    hourly_breakdown JSONB, -- 時間別内訳（24時間分）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_daily_summaries_date (date)
);

-- 週次集計テーブル
CREATE TABLE weekly_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    week_start_date DATE NOT NULL, -- 週の開始日（月曜日）
    total_waste_seconds INTEGER NOT NULL DEFAULT 0,
    total_active_seconds INTEGER NOT NULL DEFAULT 0,
    average_daily_waste_seconds INTEGER NOT NULL DEFAULT 0,
    waste_ratio_active DECIMAL(5,2) NOT NULL DEFAULT 0,
    waste_ratio_24h DECIMAL(5,2) NOT NULL DEFAULT 0,
    goal_achieved_days INTEGER NOT NULL DEFAULT 0,
    top_categories JSONB,
    daily_breakdown JSONB, -- 日別内訳（7日分）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(week_start_date),
    INDEX idx_weekly_summaries_week_start (week_start_date)
);

-- 通知ログテーブル
CREATE TABLE notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_notification_logs_created_at (created_at),
    INDEX idx_notification_logs_is_read (is_read)
);

-- 更新日時の自動更新用トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルに更新日時トリガーを設定
CREATE TRIGGER update_waste_categories_updated_at BEFORE UPDATE ON waste_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exclusion_rules_updated_at BEFORE UPDATE ON exclusion_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_summaries_updated_at BEFORE UPDATE ON daily_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_weekly_summaries_updated_at BEFORE UPDATE ON weekly_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期データの挿入
INSERT INTO waste_categories (name, type, identifier, label) VALUES
('YouTube', 'domain', 'youtube.com', 'waste'),
('X (Twitter)', 'domain', 'x.com', 'waste'),
('TikTok', 'domain', 'tiktok.com', 'waste'),
('Instagram', 'domain', 'instagram.com', 'waste'),
('Reddit', 'domain', 'reddit.com', 'waste'),
('Steam', 'app', 'steam.exe', 'waste'),
('League of Legends', 'app', 'LeagueClient.exe', 'waste'),
('VALORANT', 'app', 'VALORANT.exe', 'waste'),
('Discord', 'app', 'discord.exe', 'waste');

-- デフォルト設定の挿入
INSERT INTO user_settings (key, value, description) VALUES
('sampling_interval', '5', 'サンプリング間隔（秒）'),
('idle_threshold', '60', 'アイドル閾値（秒）'),
('goal_weekday', '3600', '平日の目標時間（秒）'),
('goal_weekend', '5400', '休日の目標時間（秒）'),
('notifications_enabled', 'true', '通知の有効/無効'),
('goal_exceeded_notification', 'true', '目標超過時の通知'),
('continuous_viewing_notification', 'true', '連続視聴30分時の通知'),
('continuous_viewing_threshold', '1800', '連続視聴通知の閾値（秒）');

-- RLS (Row Level Security) の設定
ALTER TABLE waste_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exclusion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- 全テーブルに対して全アクセス許可（個人用途のため）
CREATE POLICY "Allow all operations" ON waste_categories FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON exclusion_rules FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON user_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON daily_summaries FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON weekly_summaries FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON notification_logs FOR ALL USING (true);
