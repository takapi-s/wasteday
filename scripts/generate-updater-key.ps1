# Tauriアップデーター用の公開鍵を生成するPowerShellスクリプト
# このスクリプトを実行して、tauri.conf.jsonのpubkeyを更新してください

Write-Host "Tauriアップデーター用の鍵ペアを生成中..." -ForegroundColor Green

# 一時ディレクトリを作成
$TempDir = New-TemporaryFile | ForEach-Object { Remove-Item $_; New-Item -ItemType Directory -Path $_ }
Set-Location $TempDir

try {
    # .NETのRSAクラスを使用して鍵ペアを生成
    Add-Type -AssemblyName System.Security
    
    # RSA鍵ペアを生成（2048ビット）
    $RSA = [System.Security.Cryptography.RSA]::Create(2048)
    
    # 秘密鍵をPEM形式で保存
    $PrivateKeyPem = $RSA.ExportRSAPrivateKeyPem()
    $PrivateKeyPem | Out-File -FilePath "private.pem" -Encoding UTF8
    
    # 公開鍵をPEM形式で保存
    $PublicKeyPem = $RSA.ExportRSAPublicKeyPem()
    $PublicKeyPem | Out-File -FilePath "public.pem" -Encoding UTF8
    
    # 公開鍵をBase64エンコード
    $PublicKeyBytes = [System.Text.Encoding]::UTF8.GetBytes($PublicKeyPem)
    $PublicKeyB64 = [Convert]::ToBase64String($PublicKeyBytes)
    
    Write-Host ""
    Write-Host "=== 生成された公開鍵 ===" -ForegroundColor Yellow
    Write-Host $PublicKeyB64
    Write-Host ""
    Write-Host "この公開鍵をtauri.conf.jsonのupdater.pubkeyに設定してください" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "秘密鍵は安全に保管してください:" -ForegroundColor Red
    Write-Host "$TempDir\private.pem"
    Write-Host ""
    Write-Host "注意: 秘密鍵は絶対に公開リポジトリにコミットしないでください！" -ForegroundColor Red
    
    # 秘密鍵の場所を表示
    Write-Host "秘密鍵の場所: $TempDir\private.pem" -ForegroundColor Yellow
    Write-Host "このファイルを安全な場所に移動してください" -ForegroundColor Yellow
    
} catch {
    Write-Host "エラーが発生しました: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "詳細: $($_.Exception.StackTrace)" -ForegroundColor Red
}
