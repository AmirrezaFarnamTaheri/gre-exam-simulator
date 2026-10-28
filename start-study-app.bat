@echo off
title GRE Adaptive Study
set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0web"

echo Starting GRE Adaptive Study...
echo Your browser will open automatically in a few seconds.
echo.
echo To stop the app: close this window, or press Ctrl+C then Y.
echo.

start /min "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"

call npm run dev
pause
