// シンプルなロガー（デフォルト無効）
// 有効化方法例:
//  - localStorage.setItem('WD_DEBUG', '1')
//  - 再読み込み後に有効になります

// type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class LoggerImpl {
  private enabled: boolean;
  private scopeName?: string;

  constructor(enabled = false, scopeName?: string) {
    this.enabled = enabled;
    this.scopeName = scopeName;
  }

  static create(scopeName?: string) {
    const enabled = typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem('WD_DEBUG') === '1'
      : false;
    return new LoggerImpl(enabled, scopeName);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private format(args: any[]): any[] {
    return this.scopeName ? [`[${this.scopeName}]`, ...args] : args;
  }

  debug(...args: any[]) {
    if (!this.enabled) return;
    // eslint-disable-next-line no-console
    console.log(...this.format(args));
  }

  info(...args: any[]) {
    if (!this.enabled) return;
    // eslint-disable-next-line no-console
    console.info(...this.format(args));
  }

  warn(...args: any[]) {
    if (!this.enabled) return;
    // eslint-disable-next-line no-console
    console.warn(...this.format(args));
  }

  error(...args: any[]) {
    // エラーは常に出す（必要ならここも制御可能）
    // eslint-disable-next-line no-console
    console.error(...this.format(args));
  }
}

export const Logger = {
  create: (scope?: string) => LoggerImpl.create(scope),
};


