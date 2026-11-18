Set-Location -Path $PSScriptRoot
Remove-Item env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Go Seek Desktop Application (Windows)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

node "$PSScriptRoot\node_modules\electron\cli.js" "$PSScriptRoot" --no-sandbox
