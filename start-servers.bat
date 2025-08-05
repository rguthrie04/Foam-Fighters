@echo off
echo.
echo ========================================
echo    Starting Foam Fighters Servers
echo ========================================
echo.

REM Change to project directory
cd /d "%~dp0"

echo [1/3] Installing dependencies if needed...
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

echo.
echo [2/3] Starting Firebase Emulator (Backend API)...
start "Firebase Emulator" cmd /k "firebase emulators:start --only functions,firestore"

REM Wait a moment for emulator to start
timeout /t 5 /nobreak > nul

echo.
echo [3/3] Starting Frontend Development Server...
cd frontend
start "Frontend Server" cmd /k "npm run dev"

echo.
echo ========================================
echo    Servers Starting Up!
echo ========================================
echo.
echo Backend API: http://localhost:5001/
echo Firestore:   http://localhost:4000/
echo Frontend:    http://localhost:3001/ (Foam Fighters)
echo.
echo Press any key to open the website...
pause > nul

REM Try to open the frontend (it might be on 3000, 3001, etc.)
start http://localhost:3001/

echo.
echo Servers are running! Check the opened windows.
echo To stop servers, run: stop-servers.bat
echo.