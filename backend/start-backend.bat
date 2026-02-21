@echo off
cd /d "%~dp0"
echo Institute Management - One URL (API + Dashboard)
echo.
echo Open in browser: http://localhost:5000
echo (Dashboard and API both at this address. Keep this window open.)
echo.
echo If you see "Frontend not built", run: start-with-build.bat
echo.
node src/index.js
pause
