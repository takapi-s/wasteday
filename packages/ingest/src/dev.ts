import { IngestService, SampleEvent, ConsoleSessionWriter } from './index.js';

const ingest = new IngestService();

// Setup console writer for development
const consoleWriter = new ConsoleSessionWriter();
ingest.addWriter(consoleWriter);

ingest.onEvent(async e => {
  console.log('[ingest]', e);
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
  ingest.handleSample(sample).catch(err => {
    console.error('Sample processing error:', err);
  });
}, 5000);

// exit handling (only in Node.js environment)
if (typeof process !== 'undefined') {
  process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await ingest.flushAll();
    // 非同期INSERTを待つため少し遅延してから終了
    setTimeout(() => process.exit(0), 2000);
  });

  // 自動終了（25秒後）: session_ended を確実に発火させ、INSERTを確認しやすくする
  setTimeout(async () => {
    console.log('auto-exit');
    await ingest.flushAll();
    // 非同期INSERTを待つため少し遅延してから終了
    setTimeout(() => process.exit(0), 2000);
  }, 25000);
}


