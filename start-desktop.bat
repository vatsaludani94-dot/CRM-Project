@echo off
title GrownX CRM Desktop Launcher
echo ==================================================
echo         GrownX CRM Standalone Desktop Launcher
echo ==================================================
echo.

echo 1. Compiling Frontend Assets (Angular Production Build)...
cd frontend\angular-app
call npm run build
cd ..\..

echo.
echo 2. Starting Express Backend API Service (Port 3000)...
start "GrownX CRM - Backend API" cmd /k "cd backend && npm run dev"

echo.
echo 3. Launching Standalone Desktop Application Container (Electron)...
cd desktop
call npm start
cd ..

echo.
echo ==================================================
echo GrownX CRM Desktop container launched successfully!
echo ==================================================
pause
