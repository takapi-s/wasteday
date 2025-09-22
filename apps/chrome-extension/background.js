// Background script for WasteDay Browser Tracker
const ENDPOINT = 'http://127.0.0.1:5606/api/ingest/browsing';

class WasteDayTracker {
  constructor() {
    this.activeTabs = new Map(); // tabId -> { url, domain, startTime, title }
    this.pulseSeconds = 30;
    this.paused = false;
    this.browserFocused = true; // Chromeがフォアグラウンドかどうか
    this.init();
  }

  init() {
    // 起動時に一時停止状態を復元
    chrome.storage.local.get(['paused']).then(({ paused }) => {
      this.paused = !!paused;
    });
    // タブの更新を監視
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab);
      }
    });

    // タブのアクティブ化を監視
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo.tabId);
    });

    // タブの閉じるを監視
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoved(tabId);
    });

    // ウィンドウのフォーカス変更を監視
    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        this.handleWindowBlur();
      } else {
        this.handleWindowFocus(windowId);
      }
    });

    // Content Scriptからのメッセージを受信
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Received message from content script:', message);
      
      if (message.type === 'toggle_pause') {
        this.paused = !!message.paused;
        chrome.storage.local.set({ paused: this.paused });
        sendResponse({ success: true });
        return true;
      }

      if (message.type === 'get_popup_data') {
        const now = new Date();
        const sessions = [];
        for (const [tabId, s] of this.activeTabs.entries()) {
          sessions.push({
            tabId,
            url: s.url,
            domain: s.domain,
            title: s.title,
            // 経過秒（pulse秒でクリップした値は送信時のみ。表示用は実測）
            elapsed: Math.floor((now - new Date(s.startTime)) / 1000)
          });
        }
        sendResponse({
          success: true,
          paused: this.paused,
          activeCount: sessions.length,
          sessions
        });
        return true;
      }

      if (message.type === 'page_data') {
        // Content Scriptからのページデータを処理
        this.sendBrowserData({
          url: message.data.url,
          domain: message.data.domain,
          title: message.data.title,
          timestamp: message.data.timestamp,
          duration: message.data.duration,
          tab_id: sender.tab?.id
        });
        
        sendResponse({ success: true });
      }
      
      return true; // 非同期応答を有効にする
    });

    console.log('WasteDay Tracker initialized');

    // アラームでハートビート（サービスワーカーのサスペンド対策）
    try {
      chrome.alarms.clear('heartbeat');
    } catch (_) {}
    chrome.alarms.create('heartbeat', { periodInMinutes: 0.5 }); // 30秒
    chrome.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name !== 'heartbeat') return;
      if (!this.browserFocused) return; // 非フォーカス中は加算しない
      const currentTime = new Date().toISOString();
      for (const [tabId, session] of this.activeTabs.entries()) {
        const duration = this.calculateDuration(session.startTime);
        const bounded = Math.min(duration, this.pulseSeconds);
        await this.sendBrowserData({
          url: session.url,
          domain: session.domain,
          title: session.title,
          timestamp: session.startTime,
          duration: bounded,
          tab_id: tabId
        });
      }
    });
  }

  async handleTabUpdate(tabId, tab) {
    try {
      if (!this.isValidUrl(tab.url)) {
        return;
      }

      const domain = this.extractDomain(tab.url);
      const currentTime = new Date().toISOString();

      // 前のセッションを終了
      if (this.activeTabs.has(tabId)) {
        const previousSession = this.activeTabs.get(tabId);
        await this.sendBrowserData({
          url: previousSession.url,
          domain: previousSession.domain,
          title: previousSession.title,
          timestamp: previousSession.startTime,
          duration: this.calculateDuration(previousSession.startTime),
          tab_id: tabId
        });
      }

      // 新しいセッションを開始
      this.activeTabs.set(tabId, {
        url: tab.url,
        domain: domain,
        title: tab.title || '',
        startTime: currentTime
      });

      console.log(`Tab ${tabId} updated: ${domain}`);
    } catch (error) {
      console.error('Error handling tab update:', error);
    }
  }

  async handleTabActivated(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (this.isValidUrl(tab.url)) {
        const domain = this.extractDomain(tab.url);
        const currentTime = new Date().toISOString();

        // 前のセッションを終了（他のタブ）
        for (const [activeTabId, session] of this.activeTabs.entries()) {
          if (activeTabId !== tabId) {
            await this.sendBrowserData({
              url: session.url,
              domain: session.domain,
              title: session.title,
              timestamp: session.startTime,
              duration: this.calculateDuration(session.startTime),
              tab_id: activeTabId
            });
            this.activeTabs.delete(activeTabId);
          }
        }

        // 新しいセッションを開始
        this.activeTabs.set(tabId, {
          url: tab.url,
          domain: domain,
          title: tab.title || '',
          startTime: currentTime
        });

        console.log(`Tab ${tabId} activated: ${domain}`);
      }
    } catch (error) {
      console.error('Error handling tab activation:', error);
    }
  }

  async handleTabRemoved(tabId) {
    try {
      if (this.activeTabs.has(tabId)) {
        const session = this.activeTabs.get(tabId);
        await this.sendBrowserData({
          url: session.url,
          domain: session.domain,
          title: session.title,
          timestamp: session.startTime,
          duration: this.calculateDuration(session.startTime),
          tab_id: tabId
        });
        this.activeTabs.delete(tabId);
        console.log(`Tab ${tabId} removed`);
      }
    } catch (error) {
      console.error('Error handling tab removal:', error);
    }
  }

  async handleWindowFocus(windowId) {
    try {
      this.browserFocused = true;
      const tabs = await chrome.tabs.query({ windowId: windowId, active: true });
      if (tabs.length > 0) {
        const activeTab = tabs[0];
        if (this.isValidUrl(activeTab.url)) {
          const domain = this.extractDomain(activeTab.url);
          const currentTime = new Date().toISOString();

          // すべてのアクティブタブを終了
          for (const [tabId, session] of this.activeTabs.entries()) {
            await this.sendBrowserData({
              url: session.url,
              domain: session.domain,
              title: session.title,
              timestamp: session.startTime,
              duration: this.calculateDuration(session.startTime),
              tab_id: tabId
            });
            this.activeTabs.delete(tabId);
          }

          // フォーカスされたタブを開始
          this.activeTabs.set(activeTab.id, {
            url: activeTab.url,
            domain: domain,
            title: activeTab.title || '',
            startTime: currentTime
          });

          console.log(`Window ${windowId} focused: ${domain}`);
        }
      }
    } catch (error) {
      console.error('Error handling window focus:', error);
    }
  }

  async handleWindowBlur() {
    try {
      this.browserFocused = false;
      // すべてのアクティブセッションを終了して送信
      for (const [tabId, session] of this.activeTabs.entries()) {
        await this.sendBrowserData({
          url: session.url,
          domain: session.domain,
          title: session.title,
          timestamp: session.startTime,
          duration: this.calculateDuration(session.startTime),
          tab_id: tabId
        });
        this.activeTabs.delete(tabId);
      }
      console.log('Browser unfocused: all sessions flushed');
    } catch (error) {
      console.error('Error handling window blur:', error);
    }
  }

  async sendBrowserData(browserData) {
    if (this.paused) {
      return;
    }
    try {
      // HTTP 経由でデスクトップアプリに送信
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(browserData),
        // サービスワーカーからのCORSはデフォルトでno-cors不可。明示は不要だが参考に残す。
        // mode: 'cors',
      });
      if (!res.ok) {
        console.error('HTTP send failed:', res.status, res.statusText);
        return;
      }
      console.log('Browser data sent via HTTP');
      const now = Date.now();
      chrome.storage.local.set({ lastDataSent: now, lastConnectionTime: now, isConnected: true });
    } catch (error) {
      console.error('Error sending browser data:', error);
    }
  }

  isValidUrl(url) {
    return url && 
           (url.startsWith('http://') || url.startsWith('https://')) &&
           !url.startsWith('chrome://') &&
           !url.startsWith('chrome-extension://') &&
           !url.startsWith('moz-extension://') &&
           !url.startsWith('edge://') &&
           !url.startsWith('about:');
  }

  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      console.error('Error extracting domain:', error);
      return 'unknown';
    }
  }

  calculateDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    return Math.floor((now - start) / 1000); // 秒単位
  }
}

// 拡張機能の初期化
const tracker = new WasteDayTracker();

// setInterval はサービスワーカー失効と相性が悪いので未使用
