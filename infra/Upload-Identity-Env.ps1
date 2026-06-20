# Upload @evrace_auth_bot token to BY VPS (NOT letters/mod bot)
# Usage (pick one):
#   .\Upload-Identity-Env.ps1
#   .\Upload-Identity-Env.ps1 -Token "123456:ABC..."
#   $env:EVRACE_AUTH_BOT_TOKEN="123456:ABC..."; .\Upload-Identity-Env.ps1

param(
  [string]$Token
)

if (-not $Token) { $Token = $env:EVRACE_AUTH_BOT_TOKEN }
if (-not $Token) {
  Write-Host "Paste TELEGRAM_AUTH_BOT_TOKEN for @evrace_auth_bot, then Enter:"
  $Token = Read-Host
}
if (-not $Token) {
  Write-Error "Token empty. Use -Token, EVRACE_AUTH_BOT_TOKEN, or paste at prompt."
  exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$reload = Join-Path $scriptDir "scripts/reload-identity-bot-env.sh"
if (-not (Test-Path $reload)) {
  Write-Error "Missing $reload"
  exit 1
}

$out = Join-Path $env:TEMP "evrace-identity.env"
$content = "TELEGRAM_AUTH_BOT_TOKEN=$Token"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($out, $content, $utf8NoBom)

Write-Host "Uploading identity.env + reload script..."
scp $out deploy@193.47.42.183:/tmp/identity.env
scp $reload deploy@193.47.42.183:/tmp/reload-identity-bot-env.sh
ssh deploy@193.47.42.183 "sudo mv /tmp/identity.env /root/evrace-secrets/identity.env && sudo chmod 600 /root/evrace-secrets/identity.env && sudo bash /tmp/reload-identity-bot-env.sh"
$exit = $LASTEXITCODE
Remove-Item $out -Force
if ($exit -ne 0) { exit $exit }
Write-Host "OK. Open https://evrace.by/evr-id and try Telegram login."
