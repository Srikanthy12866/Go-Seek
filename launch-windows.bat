@echo off
title Go Seek - Hardware Report
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=
echo ========================================================
echo Starting Go Seek Desktop Application (Windows)...
echo ========================================================

if not exist "%~dp0build\index.html" (
    echo Building production React bundle...
    call npm.cmd run build
)

start "" npx.cmd electron .
