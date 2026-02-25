@echo off
echo ========================================
echo   System2ML - Starting Project
echo ========================================
echo.

echo [1/2] Starting Backend API on port 8000...
start "System2ML Backend" cmd /k "cd /d G:\Projects\System2ML && python -m ui.api"
timeout /t 3 /nobreak > nul

echo [2/2] Starting Frontend on port 3000...
cd /d G:\Projects\System2ML
npm run dev

echo.
echo ========================================
echo   System2ML is running!
echo   - API: http://localhost:8000
echo   - Frontend: http://localhost:3000
echo ========================================
