-- Row Level Security (RLS) の設定
-- 個人用途のため全テーブルに対して全アクセス許可

-- RLSの有効化
ALTER TABLE waste_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exclusion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Allow all operations" ON waste_categories;
DROP POLICY IF EXISTS "Allow all operations" ON exclusion_rules;
DROP POLICY IF EXISTS "Allow all operations" ON sessions;
DROP POLICY IF EXISTS "Allow all operations" ON user_settings;
DROP POLICY IF EXISTS "Allow all operations" ON daily_summaries;
DROP POLICY IF EXISTS "Allow all operations" ON weekly_summaries;
DROP POLICY IF EXISTS "Allow all operations" ON notification_logs;

-- 全テーブルに対して全アクセス許可（個人用途のため）
CREATE POLICY "Allow all operations" ON waste_categories FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON exclusion_rules FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON sessions FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON user_settings FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON daily_summaries FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON weekly_summaries FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON notification_logs FOR ALL USING (true);
