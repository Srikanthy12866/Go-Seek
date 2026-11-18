Set-Location -Path $PSScriptRoot
Remove-Item env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " Starting Go Seek Desktop Application (Windows)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (-not (Test-Path "$PSScriptRoot\build\index.html")) {
    Write-Host "Building production React bundle..." -ForegroundColor Yellow
    npm.cmd run build
}

Write-Host "Launching Go Seek..." -ForegroundColor Green
Start-Process -FilePath "npx.cmd" -ArgumentList "electron", "." -WorkingDirectory $PSScriptRoot
