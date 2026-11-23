@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (echo Install Node.js 24 or later, then try again. & pause & exit /b 1)
node -e "if(Number(process.versions.node.split('.')[0])<24)process.exit(1)"
if errorlevel 1 (echo Node.js 24 or later is required. & pause & exit /b 1)
if not exist server\node_modules\express (
  call npm ci --prefix server
  if errorlevel 1 (pause & exit /b 1)
)
if not exist client\node_modules\vite (
  call npm ci --prefix client
  if errorlevel 1 (pause & exit /b 1)
)
node scripts/setup.mjs
if errorlevel 1 (pause & exit /b 1)
node scripts/start.mjs
pause
