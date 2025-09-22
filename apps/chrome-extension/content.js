// Content script for WasteDay Browser Tracker
class ContentTracker {
  constructor() {
    this.startTime = Date.now();
    this.isVisible = true;
    this.init();
  }

  init() {
    // ページの可視性変更を監視
    document.addEventListener('visibilitychange', () => {
      this.handleVisibilityChange();
    });

    // ページのフォーカス変更を監視
    window.addEventListener('focus', () => {
      this.handleFocus();
    });

    window.addEventListener('blur', () => {
      this.handleBlur();
    });

    // ページの読み込み完了時
    if (document.readyState === 'complete') {
      this.handlePageLoad();
    } else {
      window.addEventListener('load', () => {
        this.handlePageLoad();
      });
    }

    console.log('WasteDay Content Tracker initialized');
  }

  handleVisibilityChange() {
    const isVisible = !document.hidden;
    
    if (isVisible !== this.isVisible) {
      this.isVisible = isVisible;
      
      if (isVisible) {
        this.handleFocus();
      } else {
        this.handleBlur();
      }
    }
  }

  handleFocus() {
    if (this.isVisible) {
      this.startTime = Date.now();
      console.log('Page focused:', window.location.hostname);
    }
  }

  handleBlur() {
    if (this.isVisible) {
      const duration = Math.floor((Date.now() - this.startTime) / 1000);
      this.sendPageData(duration);
      console.log('Page blurred:', window.location.hostname, 'Duration:', duration);
    }
  }

  handlePageLoad() {
    console.log('Page loaded:', window.location.hostname);
    // ページ読み込み時のデータは background.js で処理されるため、
    // ここでは特に何もしない
  }

  sendPageData(duration) {
    try {
      // background script へメッセージ送信。失効時は例外が出る可能性がある。
      chrome.runtime.sendMessage({
        type: 'page_data',
        data: {
          url: window.location.href,
          domain: window.location.hostname,
          title: document.title,
          duration: duration,
          timestamp: new Date().toISOString()
        }
      }, () => {
        const err = chrome.runtime.lastError;
        if (err && /Extension context invalidated/i.test(err.message || '')) {
          // 失効時は無視（サービスワーカー再起動で回復）
          return;
        }
      });
    } catch (_) {
      // 失効などの一時的な送信失敗は握りつぶす
    }
  }
}

// Content script の初期化
const contentTracker = new ContentTracker();
