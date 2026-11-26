@echo off
setlocal
cd /d "%~dp0.."
where docker >nul 2>nul
if errorlevel 1 (
  echo Docker Desktop is required. Install and start Docker Desktop, then retry.
  pause
  exit /b 1
)
echo Starting GLH web app + PostgreSQL. First start may take several minutes...
docker compose up --build -d
if errorlevel 1 (echo Docker startup failed.& pause & exit /b 1)
echo Waiting for API and database readiness...
for /L %%i in (1,1,60) do (
  curl -fsS http://127.0.0.1:4000/api/ready >nul 2>nul
  if not errorlevel 1 goto READY
  timeout /t 2 /nobreak >nul
)
echo GLH did not become ready. Run: docker compose logs --tail=100 app db
pause
exit /b 1
:READY
echo GLH is ready: http://localhost:4000
echo For a phone on the same Wi-Fi, use the computer LAN IP with port 4000.
echo Readiness: http://localhost:4000/api/ready
echo Change demo credentials in .env before use.
pause
