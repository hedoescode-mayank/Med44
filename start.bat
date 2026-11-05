@echo off
echo ========================================================
echo        Starting Med44 - Your AI Health Nurse
echo ========================================================

cd /d "%~dp0"

echo Starting FastAPI Backend on port 8000...
start "Med44 Backend API" cmd /k "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo Starting React Frontend on port 5173...
cd frontend
start "Med44 Frontend UI" cmd /k "npm run dev"
cd ..

echo ========================================================
echo  Backend:  http://localhost:8000
echo  Frontend: http://localhost:5173
echo ========================================================
echo Press any key to close this launcher window (services keep running).
pause
