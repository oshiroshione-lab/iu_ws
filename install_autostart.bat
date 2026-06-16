@echo off
REM install_autostart.bat
REM Double-click wrapper that runs install_autostart.ps1 to build the app and register
REM the dashboard to start automatically at Windows sign-in. Keep in the project root.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install_autostart.ps1"
echo.
pause
