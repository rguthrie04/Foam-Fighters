@echo off
echo.
echo ========================================
echo    Foam Fighters Server Status
echo ========================================
echo.

echo Checking for running Node.js processes...
tasklist | findstr node.exe

echo.
echo Checking Foam Fighters port 3001...
netstat -an | findstr ":3001 "

echo.
echo Checking Firebase emulator ports...
netstat -an | findstr ":5001 "
netstat -an | findstr ":4000 "

echo.
echo Trying to open possible frontend URLs...
echo.

echo Testing Foam Fighters: http://localhost:3001/
start http://localhost:3001/

echo.
echo Check the browser windows that just opened!
pause