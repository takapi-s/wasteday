// Popup script for WasteDay Browser Tracker
class PopupController {
  constructor() {
    this.init();
  }

  init() {
    this.healthEndpoint = 'http://127.0.0.1:5606/api/health';
    // 接続テストボタン
    document.getElementById('testConnection').addEventListener('click', () => {
      this.testConnection();
    });

    // 設定ボタン
    document.getElementById('viewSettings').addEventListener('click', () => {
      this.openSettings();
    });

    // 一時停止トグル
    document.getElementById('togglePause').addEventListener('click', () => {
      this.togglePause();
    });

    // 初期状態の更新
    this.updateStatus();
    this.updateStats();
    this.refreshPopupData();

    // 定期的に状態を更新
    setInterval(() => {
      this.updateStatus();
      this.updateStats();
      this.refreshPopupData();
    }, 2000);
  }

  async testConnection() {
    const statusElement = document.getElementById('status');
    const button = document.getElementById('testConnection');
    
    statusElement.textContent = '接続テスト中...';
    statusElement.className = 'status disconnected';
    button.disabled = true;
    button.textContent = 'テスト中...';

    // タイムアウト設定（10秒）
    const timeoutId = setTimeout(() => {
      console.error('Connection test timed out after 10 seconds');
      this.showStatus(false, '接続タイムアウト: ヘルスチェックが応答しません');
      button.disabled = false;
      button.textContent = '接続テスト';
    }, 10000);

    try {
      console.log('Attempting to call health endpoint');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);
      const res = await fetch(this.healthEndpoint, { method: 'GET', signal: controller.signal });
      clearTimeout(timer);
      clearTimeout(timeoutId);
      button.disabled = false;
      button.textContent = '接続テスト';
      if (res.ok) {
        this.showStatus(true, '接続OK（ヘルスチェック）');
        chrome.storage.local.set({ lastConnectionTime: Date.now(), isConnected: true });
      } else {
        this.showStatus(false, `ヘルスチェック失敗: ${res.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Connection test error:', error);
      this.showStatus(false, 'ヘルスチェックでエラーが発生しました');
      
      button.disabled = false;
      button.textContent = '接続テスト';
    }
  }

  showStatus(isConnected, message) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = isConnected ? 'status connected' : 'status disconnected';
  }

  async updateStatus() {
    try {
      // ストレージから接続状態を取得
      const result = await chrome.storage.local.get(['lastConnectionTime', 'isConnected']);
      const lastConnectionTime = result.lastConnectionTime;
      const isConnected = result.isConnected;
      
      // まず軽量ヘルスチェックを試行
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      try {
        const res = await fetch(this.healthEndpoint, { method: 'GET', signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          this.showStatus(true, 'デスクトップアプリに接続済み');
          chrome.storage.local.set({ lastConnectionTime: Date.now(), isConnected: true });
          return;
        }
      } catch (_) {
        // ヘルスチェックが失敗した場合は従来の時刻ベース判定にフォールバック
      }
      
      if (isConnected && lastConnectionTime && (Date.now() - lastConnectionTime) < 30000) {
        this.showStatus(true, '最近アクティビティあり');
      } else {
        this.showStatus(false, 'デスクトップアプリに接続されていません');
      }
    } catch (error) {
      console.error('Status update error:', error);
      this.showStatus(false, '状態の取得に失敗しました');
    }
  }

  async updateStats() {
    try {
      // アクティブタブ数を取得
      const tabs = await chrome.tabs.query({ active: true });
      document.getElementById('activeTabs').textContent = tabs.length;

      // 最終更新時刻を取得
      const result = await chrome.storage.local.get(['lastDataSent']);
      if (result.lastDataSent) {
        const lastUpdate = new Date(result.lastDataSent);
        document.getElementById('lastUpdate').textContent = lastUpdate.toLocaleTimeString();
      }
    } catch (error) {
      console.error('Stats update error:', error);
    }
  }

  async refreshPopupData() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'get_popup_data' });
      if (!response || !response.success) return;
      document.getElementById('pausedState').textContent = response.paused ? 'オン' : 'オフ';
      document.getElementById('activeTabs').textContent = response.activeCount ?? 0;

      const container = document.getElementById('currentSessions');
      if (!container) return;
      const sessions = response.sessions || [];
      if (sessions.length === 0) {
        container.innerHTML = '<p>現在アクティブなセッションはありません</p>';
        return;
      }
      const html = sessions.map(s => {
        const title = (s.title && s.title.trim().length > 0) ? s.title : s.domain;
        return `<div style="padding:6px;border:1px solid #eee;border-radius:4px;margin-bottom:6px">
          <div style="font-size:12px;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${s.title || ''}">${title}</div>
          <div style="font-size:11px;color:#6c757d">${s.domain} · ${s.elapsed}s</div>
        </div>`;
      }).join('');
      container.innerHTML = html;
    } catch (e) {
      // サービスワーカー休止等で失敗することがある
      // その場合は静かにスキップ
    }
  }

  openSettings() {
    // 設定ページを開く（必要に応じて実装）
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings.html')
    });
  }

  async togglePause() {
    try {
      const { paused } = await chrome.storage.local.get(['paused']);
      const next = !paused;
      await chrome.storage.local.set({ paused: next });
      // 背景にブロードキャスト（任意）
      chrome.runtime.sendMessage({ type: 'toggle_pause', paused: next });
      this.updateStatus();
    } catch (e) {
      console.error('Toggle pause failed:', e);
    }
  }
}

// Popup の初期化
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
