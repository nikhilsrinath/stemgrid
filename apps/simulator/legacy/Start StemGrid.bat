@echo off
title StemGrid Beta
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  start "" "http://localhost:8080"
  node server.js
) else (
  echo Node.js not found - opening the page directly instead.
  start "" "%~dp0index.html"
)
