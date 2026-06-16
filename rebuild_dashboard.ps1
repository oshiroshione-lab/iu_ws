# rebuild_dashboard.ps1
# Use this AFTER you change the app's code: it stops the running dashboard,
# makes a fresh production build, and starts it again on the fixed port 8530.
$ErrorActionPreference = 'Stop'
$proj = $PSScriptRoot
Push-Location $proj
try {
    # Stop whatever is currently listening on port 8530 (the old dashboard server).
    $conns = Get-NetTCPConnection -LocalPort 8530 -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        try {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
            Write-Host "[OK] Stopped old server (PID $($c.OwningProcess))."
        } catch {}
    }

    Write-Host "[..] Building the app (npm run build)..." -ForegroundColor Yellow
    & npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Build failed. Fix the errors above; the old server is stopped." -ForegroundColor Red
        exit 1
    }

    Write-Host "[..] Starting the dashboard on http://localhost:8530 ..." -ForegroundColor Yellow
    & wscript.exe (Join-Path $proj 'start_dashboard.vbs')
    Write-Host "[OK] Done. Open http://localhost:8530 (give it a few seconds to boot)." -ForegroundColor Green
} finally { Pop-Location }
