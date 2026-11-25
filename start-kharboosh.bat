@echo off
title Kharboosh 8-Bit Desktop Pet
start "" "http://localhost:8765/"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1" -Port 8765
