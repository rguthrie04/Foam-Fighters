@echo off
echo.
echo ========================================
echo    Stopping Foam Fighters Servers
echo ========================================
echo.

echo Stopping all Node.js processes for this project...

REM Kill Firebase emulator processes
taskkill /F /IM "java.exe" 2>nul
taskkill /F /IM "firebase.exe" 2>nul

REM Find and kill Foam Fighters Vite dev server (port 3001)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3001') do (
    taskkill /F /PID %%p 2>nul
)

REM Kill Firebase Functions processes (port 5001)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :5001') do (
    taskkill /F /PID %%p 2>nul
)

REM Kill Firestore emulator (port 8080)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8080') do (
    taskkill /F /PID %%p 2>nul
)

echo.
echo All servers stopped!
echo To restart, run: start-servers.bat
echo.
pause