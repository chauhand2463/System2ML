@echo off
echo Stopping existing System2ML Backend...
taskkill /F /FI "IMAGENAME eq python.exe" /T 2>nul
echo.
echo Starting System2ML Backend with Auto-Reload...
cd /d G:\Projects\System2ML
start "System2ML Backend" cmd /k "python -m ui.api"
echo.
echo Backend should now be running with the latest changes!
pause
