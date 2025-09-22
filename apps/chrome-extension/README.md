# WasteDay Chrome Extension

WasteDayデスクトップアプリケーションと連携するChrome拡張機能です。ブラウジング活動を自動的に追跡し、ドメイン別の時間計測データをデスクトップアプリに送信します。

## 機能

- **自動ブラウジング追跡**: アクティブなタブの変更を監視し、ドメイン別の滞在時間を計測
- **ネイティブメッセージング**: Chrome拡張機能とデスクトップアプリ間の安全な通信
- **リアルタイムデータ送信**: ブラウジングデータをリアルタイムでWasteDayアプリに送信
- **ドメイン分類**: 訪問したドメインを自動的に分類・管理

## インストール方法

### 1. デスクトップアプリの準備

まず、WasteDayデスクトップアプリケーションをビルドしてインストールしてください：

```bash
cd apps/desktop
npm run tauri build
```

### 2. ネイティブメッセージングの設定

Windowsの場合、レジストリにネイティブメッセージングホストを登録する必要があります。

#### Windows での設定

1. 以下のレジストリキーを作成：
   ```
   HKEY_CURRENT_USER\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.pocky.wasteday
   ```

2. 値として、WasteDayアプリの`native_messaging_host.exe`のパスを設定：
   ```
   C:\Users\[ユーザー名]\AppData\Local\wasteday\native_messaging_host.exe
   ```

#### macOS での設定

1. 以下のディレクトリにマニフェストファイルを作成：
   ```
   ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.pocky.wasteday.json
   ```

2. マニフェストファイルの内容：
   ```json
   {
     "name": "com.pocky.wasteday",
     "description": "WasteDay Native Messaging Host",
     "path": "/Applications/wasteday.app/Contents/MacOS/native_messaging_host",
     "type": "stdio",
     "allowed_origins": [
       "chrome-extension://[拡張機能ID]/"
     ]
   }
   ```

### 3. Chrome拡張機能のインストール

1. Chrome拡張機能のデベロッパーモードを有効化
2. 「パッケージ化されていない拡張機能を読み込む」をクリック
3. `apps/chrome-extension`フォルダを選択

## 使用方法

1. Chrome拡張機能をインストール後、拡張機能アイコンをクリック
2. 「接続テスト」ボタンでデスクトップアプリとの接続を確認
3. 通常通りブラウジングを行うと、自動的にデータが収集・送信されます

## データ収集内容

- **URL**: 訪問したWebページのURL
- **ドメイン**: 抽出されたドメイン名
- **タイトル**: ページタイトル
- **滞在時間**: ドメインでの滞在時間（秒）
- **タイムスタンプ**: アクセス時刻
- **タブID**: Chromeのタブ識別子

## プライバシー

- データはローカルのWasteDayアプリケーションにのみ送信されます
- 外部サーバーには一切送信されません
- 収集されたデータは、ユーザーのローカルデータベースに保存されます

## トラブルシューティング

### デスクトップアプリに接続できない

1. WasteDayデスクトップアプリが起動していることを確認
2. ネイティブメッセージングの設定が正しいことを確認
3. Chrome拡張機能の接続テストを実行

### データが送信されない

1. 拡張機能の権限設定を確認
2. デスクトップアプリのログを確認
3. Chrome拡張機能のデベロッパーツールでエラーを確認

## 開発

### ローカル開発環境

```bash
# 拡張機能の開発
cd apps/chrome-extension
npm run dev

# デスクトップアプリの開発
cd apps/desktop
npm run tauri dev
```

### ビルド

```bash
# 拡張機能のパッケージ化
cd apps/chrome-extension
npm run package
```

## ライセンス

MIT License
