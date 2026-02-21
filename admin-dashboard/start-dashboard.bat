@echo off
cd /d "%~dp0"
echo Starting Institute Admin Dashboard...
echo.
echo When you see "Local: http://localhost:5174/" below, open that URL in your browser.
echo.
echo Keep this window OPEN while using the dashboard. Closing it will stop the server.
echo.
npm run dev
pause
