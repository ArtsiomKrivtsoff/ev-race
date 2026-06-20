# Run locally once — token ONLY for @evrace_auth_bot (NOT letters/operators bot)
# KeePass / BotFather → evrace_auth_bot → API token

$out = Join-Path $env:TEMP "evrace-identity.env"
Write-Host "Paste TELEGRAM_AUTH_BOT_TOKEN for @evrace_auth_bot, then Enter:"
$token = Read-Host

$content = "TELEGRAM_AUTH_BOT_TOKEN=$token"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($out, $content, $utf8NoBom)

scp $out deploy@193.47.42.183:/tmp/identity.env
ssh deploy@193.47.42.183 @"
sudo mv /tmp/identity.env /root/evrace-secrets/identity.env
sudo chmod 600 /root/evrace-secrets/identity.env
if test -f /tmp/evrace-community-identity/infra/scripts/reload-identity-bot-env.sh; then
  bash /tmp/evrace-community-identity/infra/scripts/reload-identity-bot-env.sh
else
  echo 'Run reload-identity-bot-env.sh on VPS after syncing repo'
fi
"@
Remove-Item $out -Force
Write-Host "identity.env uploaded. If functions not restarted, SSH and run:"
Write-Host "  bash /tmp/evrace-community-identity/infra/scripts/reload-identity-bot-env.sh"
