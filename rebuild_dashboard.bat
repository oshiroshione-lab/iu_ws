@echo off
REM rebuild_dashboard.bat
REM Double-click after changing the app's code: rebuilds and restarts the dashboard
REM on the fixed port 8530. Keep this file in the project root.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0rebuild_dashboard.ps1"
echo.
pause
