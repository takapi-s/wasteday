-- 初期データの挿入
-- 要件定義に基づくデフォルトの浪費カテゴリと設定

-- 浪費カテゴリの初期データ
INSERT INTO waste_categories (name, type, identifier, label) VALUES
('YouTube', 'domain', 'youtube.com', 'waste'),
('X (Twitter)', 'domain', 'x.com', 'waste'),
('TikTok', 'domain', 'tiktok.com', 'waste'),
('Instagram', 'domain', 'instagram.com', 'waste'),
('Reddit', 'domain', 'reddit.com', 'waste'),
('Steam', 'app', 'steam.exe', 'waste'),
('League of Legends', 'app', 'LeagueClient.exe', 'waste'),
('VALORANT', 'app', 'VALORANT.exe', 'waste'),
('Discord', 'app', 'discord.exe', 'waste')
ON CONFLICT (type, identifier) DO NOTHING;

-- デフォルト設定の挿入
INSERT INTO user_settings (key, value, description) VALUES
('sampling_interval', '5', 'サンプリング間隔（秒）'),
('idle_threshold', '60', 'アイドル閾値（秒）'),
('goal_weekday', '3600', '平日の目標時間（秒）'),
('goal_weekend', '5400', '休日の目標時間（秒）'),
('notifications_enabled', 'true', '通知の有効/無効'),
('goal_exceeded_notification', 'true', '目標超過時の通知'),
('continuous_viewing_notification', 'true', '連続視聴30分時の通知'),
('continuous_viewing_threshold', '1800', '連続視聴通知の閾値（秒）')
ON CONFLICT (key) DO NOTHING;
