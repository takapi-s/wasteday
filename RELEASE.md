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

#### 2. アップデートサーバーの設定

`tauri.conf.json` の `updater.endpoints` を実際のアップデートサーバーのURLに変更してください：

```json
{
  "updater": {
    "active": true,
    "endpoints": [
      "https://your-update-server.com/{{target}}/{{arch}}/{{current_version}}"
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

#### 4. アップデートサーバーへのアップロード

リリース後、以下のファイルをアップデートサーバーにアップロードしてください：

- `wasteday_1.0.0_x64_en-US.msi` (Windows MSI)
- `wasteday_1.0.0_x64-setup.exe` (Windows NSIS)
- `wasteday_1.0.0_x64.AppImage` (Linux)
- `wasteday_1.0.0_x64.dmg` (macOS)

### アップデートサーバーの要件

アップデートサーバーは以下のエンドポイントを提供する必要があります：

```
GET /{target}/{arch}/{current_version}
```

レスポンス例：
```json
{
  "version": "1.0.1",
  "notes": "バグ修正とパフォーマンス改善",
  "pub_date": "2024-01-01T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkK...",
      "url": "https://releases.wasteday.app/wasteday_1.0.1_x64-setup.exe"
    }
  }
}
```

### セキュリティ

- 秘密鍵は絶対に公開リポジトリにコミットしないでください
- アップデートファイルは署名されているため、改ざんを検出できます
- HTTPSを使用してアップデートファイルを配信してください

### トラブルシューティング

1. **アップデートが検出されない場合**
   - アップデートサーバーのURLが正しいか確認
   - ネットワーク接続を確認
   - アプリのバージョンが正しく設定されているか確認

2. **インストールに失敗する場合**
   - 管理者権限でアプリを実行
   - ウイルス対策ソフトがブロックしていないか確認
   - ディスク容量が十分か確認
