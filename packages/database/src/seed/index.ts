import { supabaseAdmin } from '../client/supabase';
import type { Database } from '../types/supabase';

async function upsert(table: keyof Database['public']['Tables'], rows: any[], onConflict?: string) {
  for (const row of rows) {
    const { error } = await supabaseAdmin.from(table as any).upsert(row, onConflict ? { onConflict } : undefined);
    if (error) throw error;
  }
}

async function main() {
  // waste_categories（重複回避のためidentifier+typeで確認したいが、upsert簡易化のためid生成）
  await upsert('waste_categories', [
    { name: 'YouTube', type: 'domain', identifier: 'youtube.com', label: 'waste', is_active: true },
    { name: 'X (Twitter)', type: 'domain', identifier: 'x.com', label: 'waste', is_active: true },
    { name: 'TikTok', type: 'domain', identifier: 'tiktok.com', label: 'waste', is_active: true },
    { name: 'Instagram', type: 'domain', identifier: 'instagram.com', label: 'waste', is_active: true },
    { name: 'Reddit', type: 'domain', identifier: 'reddit.com', label: 'waste', is_active: true },
    { name: 'Steam', type: 'app', identifier: 'steam.exe', label: 'waste', is_active: true },
    { name: 'League of Legends', type: 'app', identifier: 'LeagueClient.exe', label: 'waste', is_active: true },
    { name: 'VALORANT', type: 'app', identifier: 'VALORANT.exe', label: 'waste', is_active: true },
    { name: 'Discord', type: 'app', identifier: 'discord.exe', label: 'waste', is_active: true },
  ], 'type,identifier');

  // user_settings（keyでupsert）
  await upsert('user_settings', [
    { key: 'sampling_interval', value: '5', description: 'サンプリング間隔（秒）' },
    { key: 'idle_threshold', value: '60', description: 'アイドル閾値（秒）' },
    { key: 'goal_weekday', value: '3600', description: '平日の目標時間（秒）' },
    { key: 'goal_weekend', value: '5400', description: '休日の目標時間（秒）' },
    { key: 'notifications_enabled', value: 'true', description: '通知の有効/無効' },
    { key: 'goal_exceeded_notification', value: 'true', description: '目標超過時の通知' },
    { key: 'continuous_viewing_notification', value: 'true', description: '連続視聴30分時の通知' },
    { key: 'continuous_viewing_threshold', value: '1800', description: '連続視聴通知の閾値（秒）' },
  ], 'key');

  // exclusion_rules（YouTube学習チャンネルなど）
  const { data: ytCat } = await supabaseAdmin.from('waste_categories').select('id').eq('type', 'domain').eq('identifier', 'youtube.com').single();
  if (ytCat?.id) {
    await upsert('exclusion_rules', [
      { category_id: ytCat.id, rule_type: 'channel_id', pattern: 'UCYO_jab_esuFRV4b17AJtAw', description: '3Blue1Brown (学習) 除外', is_active: true },
      { category_id: ytCat.id, rule_type: 'path', pattern: '/courses', description: 'コースサイト配下を除外', is_active: true },
    ]);
  }

  // daily_summaries / weekly_summaries（ゼロ初期化・冪等）
  const today = new Date();
  const yyyy = today.toISOString().slice(0,10);
  await upsert('daily_summaries', [
    { date: yyyy, total_waste_seconds: 0, total_active_seconds: 0, waste_ratio_active: 0, waste_ratio_24h: 0, goal_seconds: 3600, goal_achieved: false, top_categories: [], hourly_breakdown: {} },
  ], 'date');

  const monday = new Date(today); const day = monday.getDay(); const diff = (day === 0 ? -6 : 1) - day; monday.setDate(today.getDate() + diff);
  const week = monday.toISOString().slice(0,10);
  await upsert('weekly_summaries', [
    { week_start_date: week, total_waste_seconds: 0, total_active_seconds: 0, average_daily_waste_seconds: 0, waste_ratio_active: 0, waste_ratio_24h: 0, goal_achieved_days: 0, top_categories: [], daily_breakdown: {} },
  ], 'week_start_date');

  // 通知ログ（存在しても追加）
  await supabaseAdmin.from('notification_logs').insert({
    notification_type: 'info', title: 'Wasteday シード', message: '初期データを投入しました。', is_read: false, metadata: { source: 'seed-script' }
  });

  console.log('seed completed.');
}

main().catch((e)=>{console.error(e);process.exit(1)});
