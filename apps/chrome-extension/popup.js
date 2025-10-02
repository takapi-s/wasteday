// Popup script for WasteDay Browser Tracker
class PopupController {
  constructor() {
    this.init();
  }

  init() {
    this.healthEndpoint = 'http://127.0.0.1:5606/api/health';
    // no buttons

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

  // removed testConnection

  showStatus(isConnected, message) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = isConnected ? 'status connected' : 'status disconnected';
  }

  async updateStatus() {
    try {
      // Get connection state from storage
      const result = await chrome.storage.local.get(['lastConnectionTime', 'isConnected']);
      const lastConnectionTime = result.lastConnectionTime;
      const isConnected = result.isConnected;
      
      // Try lightweight health check first
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      try {
        const res = await fetch(this.healthEndpoint, { method: 'GET', signal: controller.signal });
        clearTimeout(timer);
        if (res.ok) {
          this.showStatus(true, 'Connected to desktop app');
          chrome.storage.local.set({ lastConnectionTime: Date.now(), isConnected: true });
          return;
        }
      } catch (_) {
        // Fallback to time-based judgment if health check fails
      }
      
      if (isConnected && lastConnectionTime && (Date.now() - lastConnectionTime) < 30000) {
        this.showStatus(true, 'Recent activity');
      } else {
        this.showStatus(false, 'Not connected to desktop app');
      }
    } catch (error) {
      console.error('Status update error:', error);
      this.showStatus(false, 'Failed to get status');
    }
  }

  async updateStats() {
    try {
      // Get number of active tabs
      const tabs = await chrome.tabs.query({ active: true });
      document.getElementById('activeTabs').textContent = tabs.length;

      // Get last update time
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
      // no paused state row any more
      document.getElementById('activeTabs').textContent = response.activeCount ?? 0;

      const container = document.getElementById('currentSessions');
      if (!container) return;
      const sessions = response.sessions || [];
      if (sessions.length === 0) {
        container.innerHTML = '<p>No active sessions</p>';
        return;
      }
      const html = sessions.map(s => {
        const title = (s.title && s.title.trim().length > 0) ? s.title : s.domain;
        return `<div style="padding:6px;border:1px solid #1f2430;border-radius:4px;margin-bottom:6px;background:#111318">
          <div style="font-size:12px;color:#e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${s.title || ''}">${title}</div>
          <div style="font-size:11px;color:#9ca3af">${s.domain} · ${s.elapsed}s</div>
        </div>`;
      }).join('');
      container.innerHTML = html;
    } catch (e) {
      // It can fail due to service worker suspension; silently skip
    }
  }
}

// Popup の初期化
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});
