import { IngestService, SampleEvent } from './index.js';
import { insertSession } from './writer.js';

const ingest = new IngestService();

ingest.onEvent(async e => {
  console.log('[ingest]', e);
  try {
    await insertSession(e);
  } catch (err) {
    console.error('insert error', err);
  }
});

// simple mock feeder: emits alternating samples every 5s
function nowIso() {
  return new Date().toISOString();
}

let toggle = false;
setInterval(() => {
  const sample: SampleEvent = {
    timestamp: nowIso(),
    category: 'app',
    identifier: toggle ? 'code.exe' : 'discord.exe',
    window_title: toggle ? 'main.ts — Visual Studio Code' : 'Friends — Discord',
    user_state: 'active',
  };
  toggle = !toggle;
  ingest.handleSample(sample);
}, 5000);

// exit handling
process.on('SIGINT', () => {
  ingest.flushAll();
  // 非同期INSERTを待つため少し遅延してから終了
  setTimeout(() => process.exit(0), 2000);
});

// 自動終了（25秒後）: session_ended を確実に発火させ、INSERTを確認しやすくする
setTimeout(() => {
  console.log('auto-exit');
  ingest.flushAll();
  // 非同期INSERTを待つため少し遅延してから終了
  setTimeout(() => process.exit(0), 2000);
}, 25000);


