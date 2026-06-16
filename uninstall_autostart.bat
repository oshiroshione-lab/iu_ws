@echo off
REM uninstall_autostart.bat
REM Remove the dashboard autostart launcher from the current user's Startup folder.
set "DST=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\iu-knowledge-dashboard.vbs"
if exist "%DST%" (
  del "%DST%"
  echo [OK] Autostart removed. The dashboard will no longer start at sign-in.
  echo      An already-running server keeps running until you sign out or stop it.
) else (
  echo [INFO] No autostart launcher found. Nothing to remove.
)
echo.
pause
