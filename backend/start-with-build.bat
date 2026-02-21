@echo off
cd /d "%~dp0"
echo Building frontend...
cd "..\admin-dashboard"
call npm run build
cd "..\backend"
echo.
echo Starting server at http://localhost:5000
echo.
node src/index.js
pause
