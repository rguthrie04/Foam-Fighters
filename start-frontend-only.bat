@echo off
echo ========================================
echo    Starting Foam Fighters Frontend
echo ========================================
echo.
echo [1/2] Checking dependencies...
cd frontend
if not exist node_modules (
    echo Installing dependencies...
    npm install
)

echo.
echo [2/2] Starting Development Server...
echo.
echo Frontend will be available at: http://localhost:3001
echo.
echo Press Ctrl+C to stop the server
echo ========================================
npm run dev
pause