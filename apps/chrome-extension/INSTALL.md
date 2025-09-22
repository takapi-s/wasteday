# WasteDay Chrome拡張機能 インストールガイド

## 概要

WasteDay Chrome拡張機能は、ブラウジング活動を自動的に追跡し、ドメイン別の時間計測データをWasteDayデスクトップアプリケーションに送信します。

## 前提条件

1. **WasteDayデスクトップアプリケーション**がインストール済みであること
2. **Google Chrome**がインストール済みであること
3. デスクトップアプリケーションがビルド済みであること（`native_messaging_host.exe`が存在）

## インストール手順

### 1. デスクトップアプリケーションのビルド

まず、WasteDayデスクトップアプリケーションをビルドしてください：

```bash
cd apps/desktop
npm run tauri build
```

ビルドが完了すると、以下のファイルが生成されます：
- `src-tauri/target/release/native_messaging_host.exe` (Windows)
- `src-tauri/target/release/native_messaging_host` (macOS/Linux)

### 2. Chrome拡張機能のインストール

1. Chromeブラウザを開く
2. アドレスバーに `chrome://extensions/` と入力
3. 右上の「デベロッパーモード」を有効化
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `apps/chrome-extension` フォルダを選択

### 3. ネイティブメッセージングの設定

#### Windows環境

PowerShellを管理者権限で実行し、以下のコマンドを実行：

```powershell
# 拡張機能IDを取得（chrome://extensions/ で確認）
$extensionId = "あなたの拡張機能ID"

# 設定スクリプトを実行
.\scripts\setup-native-messaging.ps1 -ExtensionId $extensionId
```

#### macOS/Linux環境

ターミナルで以下のコマンドを実行：

```bash
# 拡張機能IDを取得（chrome://extensions/ で確認）
export EXTENSION_ID="あなたの拡張機能ID"

# 設定スクリプトを実行
./scripts/setup-native-messaging.sh -e $EXTENSION_ID
```

### 4. 接続テスト

1. Chrome拡張機能のアイコンをクリック
2. 「接続テスト」ボタンをクリック
3. 「デスクトップアプリに接続済み」と表示されれば成功

## 使用方法

### 自動追跡

拡張機能をインストール・設定後、通常通りブラウジングを行うだけで自動的にデータが収集されます：

- **タブ切り替え**: アクティブなタブの変更を検知
- **ページ遷移**: 新しいページへの移動を追跡
- **滞在時間**: 各ドメインでの滞在時間を計測
- **ウィンドウフォーカス**: ブラウザウィンドウのフォーカス変更を監視

### データ送信

- 5分ごとにアクティブセッションのデータを送信
- タブを閉じる際にセッションデータを送信
- ブラウザを閉じる際にすべてのアクティブセッションを送信

## トラブルシューティング

### デスクトップアプリに接続できない

**症状**: 接続テストで「デスクトップアプリに接続できません」と表示される

**解決方法**:
1. WasteDayデスクトップアプリが起動していることを確認
2. ネイティブメッセージングの設定を再確認
3. レジストリ/マニフェストファイルのパスが正しいことを確認
4. デスクトップアプリのログを確認

### データが送信されない

**症状**: ブラウジングしているのにWasteDayアプリにデータが表示されない

**解決方法**:
1. Chrome拡張機能の権限設定を確認
2. 拡張機能のデベロッパーツールでエラーを確認
3. デスクトップアプリのログファイルを確認
4. 接続テストを再実行

### 権限エラー

**症状**: ネイティブメッセージングの設定で権限エラーが発生

**解決方法**:
1. PowerShellを管理者権限で実行
2. レジストリエディタで手動設定
3. Chromeの再起動

## データプライバシー

- 収集されるデータはすべてローカルに保存されます
- 外部サーバーには一切送信されません
- 収集される情報：
  - 訪問したURL
  - ドメイン名
  - ページタイトル
  - 滞在時間
  - アクセス時刻

## アンインストール

### Chrome拡張機能の削除

1. `chrome://extensions/` を開く
2. WasteDay拡張機能の「削除」をクリック

### ネイティブメッセージングの削除

#### Windows環境

```powershell
.\scripts\setup-native-messaging.ps1 -Uninstall
```

#### macOS/Linux環境

```bash
./scripts/setup-native-messaging.sh --uninstall
```

## 開発者向け情報

### 拡張機能の開発

```bash
cd apps/chrome-extension
# ファイルを編集後、chrome://extensions/ で「再読み込み」をクリック
```

### デバッグ

1. Chrome拡張機能のデベロッパーツールを使用
2. デスクトップアプリのログファイルを確認
3. ネイティブメッセージングの通信ログを確認

### ログファイルの場所

- **Windows**: `%TEMP%\wasteday\wasteday.log`
- **macOS**: `~/Library/Logs/wasteday/wasteday.log`
- **Linux**: `~/.local/share/wasteday/wasteday.log`

## サポート

問題が発生した場合は、以下の情報を含めて報告してください：

1. 使用しているOS
2. Chromeのバージョン
3. WasteDayアプリのバージョン
4. エラーメッセージ
5. ログファイルの内容
