@echo off
REM restart_dashboard.bat
REM Double-click to restart the dashboard on port 8530 WITHOUT rebuilding
REM (use this when it is stuck, or after editing .env.local). Keep this in the project root.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0restart_dashboard.ps1"
echo.
pause
