@echo off
echo ==============================================================
echo  System2ML - Quick Start
echo ==============================================================
echo.

echo [1] Starting Redis...
docker start redis
docker exec redis redis-cli ping
echo.

echo [2] Starting Celery Worker...
start "Celery" cmd /k "cd /d G:\Projects\System2ML && celery -A agent.tasks worker --loglevel=info"
echo.

echo [3] Starting API Server...
start "API" cmd /k "cd /d G:\Projects\System2ML && python -m ui.api"
echo.

echo ==============================================================
echo  All services starting in new windows...
echo  Wait ~10 seconds then test at:
echo    http://localhost:8000
echo ==============================================================
pause
