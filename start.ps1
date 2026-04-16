param(
    [switch]$SkipRedis,
    [switch]$SkipCelery,
    [switch]$ApiOnly
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host "  System2ML - Starting All Services" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host ""

if (-not $SkipRedis) {
    Write-Host "=== Starting Redis ===" -ForegroundColor Cyan
    docker start redis 2>$null
    $pong = docker exec redis redis-cli ping 2>$null
    if ($pong -eq "PONG") {
        Write-Host "Redis: PONG OK" -ForegroundColor Green
    } else {
        Write-Host "Redis: FAILED" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Starting Celery Worker (in current terminal) ===" -ForegroundColor Cyan
Write-Host "   Run: celery -A agent.tasks worker --loglevel=info" -ForegroundColor Gray
Write-Host ""

Write-Host "=== Starting API Server ===" -ForegroundColor Cyan
Write-Host "   Run: python -m ui.api" -ForegroundColor Gray
Write-Host ""

Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host "  All services ready!" -ForegroundColor Yellow
Write-Host "  Redis:   localhost:6379" -ForegroundColor Yellow
Write-Host "  API:    http://localhost:8000" -ForegroundColor Yellow
Write-Host "  Docs:   http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host ""
