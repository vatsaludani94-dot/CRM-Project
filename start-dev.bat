@echo off
title CRM NEXUS Dev Server Launcher
echo ==================================================
echo             CRM NEXUS - LAUNCHER
echo ==================================================
echo.
echo Launching Express Backend API Server (Port 3000)...
start "CRM NEXUS - Express Backend" cmd /k "cd backend && npm run dev"

echo Launching Angular 20 Frontend Client (Port 4200)...
start "CRM NEXUS - Angular Frontend" cmd /k "cd frontend\angular-app && npm start"

echo.
echo ==================================================
echo Dev servers starting in background terminals.
echo Web App: http://localhost:4200
echo REST API: http://localhost:3000
echo ==================================================
pause
