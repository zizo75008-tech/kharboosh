@echo off
title Kharboosh Mobile + Desktop LAN Server
echo Starting Kharboosh on local network for Android / iPhone / Windows...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port 8765 -BindAny
pause
