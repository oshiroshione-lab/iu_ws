# install_autostart.ps1
# Build the app and register the iU Knowledge WS dashboard to start automatically
# at Windows sign-in. Creates a tiny windowless launcher in the current user's
# Startup folder that runs this project's start_dashboard.vbs.
# Re-run this after moving the project folder or after changing code (it rebuilds).
$ErrorActionPreference = 'Stop'

$proj   = $PSScriptRoot
$target = Join-Path $proj 'start_dashboard.vbs'
if (-not (Test-Path $target)) {
    Write-Host "[ERROR] start_dashboard.vbs not found next to this script: $proj" -ForegroundColor Red
    exit 1
}

# Next.js needs a PRODUCTION build before `next start` works.
Write-Host "[..] Building the app (npm run build). This takes a moment..." -ForegroundColor Yellow
Push-Location $proj
try { & npm run build } finally { Pop-Location }
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed. Fix the errors above, then run this again." -ForegroundColor Red
    exit 1
}

$startup = [Environment]::GetFolderPath('Startup')
$dst     = Join-Path $startup 'iu-knowledge-dashboard.vbs'

# The launcher just runs the project's self-locating start_dashboard.vbs by absolute path,
# so the actual launch command lives in ONE place and never drifts.
$line = 'CreateObject("WScript.Shell").Run "wscript.exe ""' + $target + '""", 0, False'

# Write as UTF-16 (Unicode, with BOM) so wscript reads the Japanese path correctly
# regardless of the system code page.
Set-Content -Path $dst -Value $line -Encoding Unicode

Write-Host ""
Write-Host "[OK] Autostart registered." -ForegroundColor Green
Write-Host "     The dashboard starts automatically at your next Windows sign-in."
Write-Host "     URL      : http://localhost:8530"
Write-Host "     Launcher : $dst"
Write-Host ""
Write-Host "     To start it right now without signing out, double-click start_dashboard.vbs."
Write-Host "     To remove autostart later, run uninstall_autostart.bat."
