#!/bin/bash

# Tauriアップデーター用の公開鍵を生成するスクリプト
# このスクリプトを実行して、tauri.conf.jsonのpubkeyを更新してください

echo "Tauriアップデーター用の鍵ペアを生成中..."

# 一時ディレクトリを作成
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# 秘密鍵を生成
openssl genrsa -out private.pem 4096

# 公開鍵を生成
openssl rsa -in private.pem -pubout -out public.pem

# 公開鍵をBase64エンコード
PUBLIC_KEY_B64=$(base64 -w 0 public.pem)

echo ""
echo "=== 生成された公開鍵 ==="
echo "$PUBLIC_KEY_B64"
echo ""
echo "この公開鍵をtauri.conf.jsonのupdater.pubkeyに設定してください"
echo ""
echo "秘密鍵は安全に保管してください:"
echo "$TEMP_DIR/private.pem"
echo ""
echo "注意: 秘密鍵は絶対に公開リポジトリにコミットしないでください！"

# 秘密鍵の場所を表示
echo "秘密鍵の場所: $TEMP_DIR/private.pem"
echo "このファイルを安全な場所に移動してください"
