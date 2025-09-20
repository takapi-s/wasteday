# WasteDay リリースガイド

## 自動アップデート機能

WasteDayアプリケーションには自動アップデート機能が実装されています。

### 設定済みの機能

1. **自動アップデートチェック**: アプリ起動時に自動でアップデートをチェック
2. **アップデート通知**: 新しいバージョンが利用可能な場合に通知を表示
3. **ワンクリックインストール**: 通知から直接アップデートをインストール可能

### リリース手順

#### 1. アップデーター用の鍵ペアを生成

```powershell
# Windows
.\scripts\generate-updater-key.ps1

# Linux/macOS
./scripts/generate-updater-key.sh
```

生成された公開鍵を `apps/desktop/src-tauri/tauri.conf.json` の `updater.pubkey` に設定してください。

#### 2. アップデート設定（GitHub Releases使用）

`tauri.conf.json` の `updater.endpoints` は既にGitHub Releases APIに設定済みです：

```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://api.github.com/repos/takapi-s/wasteday/releases/latest"
    ],
    "dialog": true,
    "pubkey": "YOUR_GENERATED_PUBLIC_KEY"
  }
}
```

#### 3. リリースの作成

```bash
# バージョンタグを作成
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actionsが自動的にリリースをビルドし、GitHub Releasesにアップロードします。

#### 4. GitHub Releasesによる自動配信

GitHub Actionsが自動的に以下のファイルをGitHub Releasesにアップロードします：

- `wasteday_1.0.0_x64_en-US.msi` (Windows MSI)
- `wasteday_1.0.0_x64-setup.exe` (Windows NSIS)
- `wasteday_1.0.0_x64.AppImage` (Linux)
- `wasteday_1.0.0_x64.dmg` (macOS)

### GitHub Releases API

Tauriは自動的にGitHub Releases APIから最新リリース情報を取得します：

```
GET https://api.github.com/repos/takapi-s/wasteday/releases/latest
```

レスポンス例：
```json
{
  "tag_name": "v1.0.1",
  "name": "v1.0.1",
  "body": "バグ修正とパフォーマンス改善",
  "published_at": "2024-01-01T00:00:00Z",
  "assets": [
    {
      "name": "wasteday_1.0.1_x64-setup.exe",
      "browser_download_url": "https://github.com/takapi-s/wasteday/releases/download/v1.0.1/wasteday_1.0.1_x64-setup.exe"
    }
  ]
}
```

### セキュリティ

- 秘密鍵は絶対に公開リポジトリにコミットしないでください
- アップデートファイルは署名されているため、改ざんを検出できます
- HTTPSを使用してアップデートファイルを配信してください

### トラブルシューティング

1. **アップデートが検出されない場合**
   - GitHub Releases APIのアクセス権限を確認
   - ネットワーク接続を確認
   - アプリのバージョンが正しく設定されているか確認
   - GitHub Releasesに最新バージョンが公開されているか確認

2. **インストールに失敗する場合**
   - 管理者権限でアプリを実行
   - ウイルス対策ソフトがブロックしていないか確認
   - ディスク容量が十分か確認
