@echo off
title Go Seek - Hardware Report
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
echo ========================================================
echo Starting Go Seek Desktop Application (Windows)...
echo ========================================================

node "%~dp0node_modules\electron\cli.js" "%~dp0." --no-sandbox
