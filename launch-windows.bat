@echo off
title Go Seek - Hardware Report
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
echo ========================================================
echo Starting Go Seek Desktop Application (Windows)...
echo ========================================================

if exist "%~dp0node_modules\electron\dist\electron.exe" (
  "%~dp0node_modules\electron\dist\electron.exe" "%~dp0." --no-sandbox
) else (
  npm run desktop:start
)
