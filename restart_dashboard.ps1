# restart_dashboard.ps1
# Use this when the dashboard is stuck, or after editing .env.local: it stops the
# running dashboard and starts it again on the fixed port 8530 -- WITHOUT rebuilding.
# (If you changed the app's CODE, use rebuild_dashboard instead so the build is fresh.)
$ErrorActionPreference = 'Stop'
$proj = $PSScriptRoot
Push-Location $proj
try {
    # `next start` needs a production build. If there is none yet, a plain restart
    # would launch into a hidden, silent failure -- so stop here with a clear hint.
    if (-not (Test-Path (Join-Path $proj '.next\BUILD_ID'))) {
        Write-Host "[ERROR] No production build found (.next\BUILD_ID is missing)." -ForegroundColor Red
        Write-Host "        Run rebuild_dashboard.bat first to build, then this restart will work."
        exit 1
    }

    # Stop whatever is currently listening on port 8530 (the old dashboard server).
    $conns = Get-NetTCPConnection -LocalPort 8530 -State Listen -ErrorAction SilentlyContinue
    $stopped = $false
    foreach ($c in $conns) {
        try {
            Stop-Process -Id $c.OwningProcess -Force -ErrorAction Stop
            Write-Host "[OK] Stopped old server (PID $($c.OwningProcess))."
            $stopped = $true
        } catch {}
    }
    if (-not $stopped) {
        Write-Host "[..] Nothing was running on port 8530 (will just start a fresh one)."
    }

    # Give Windows a moment to release the port before we bind to it again.
    Start-Sleep -Seconds 1

    Write-Host "[..] Starting the dashboard on http://localhost:8530 ..." -ForegroundColor Yellow
    & wscript.exe (Join-Path $proj 'start_dashboard.vbs')
    Write-Host "[OK] Done. Open http://localhost:8530 (give it a few seconds to boot)." -ForegroundColor Green
} finally { Pop-Location }
