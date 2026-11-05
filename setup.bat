@echo off
echo ========================================================
echo        Setting up Med44 - Your AI Health Nurse
echo ========================================================

cd /d "%~dp0"

echo [1/3] Installing Python dependencies...
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b %errorlevel%
)

echo [2/3] Installing Frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install npm packages.
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..

echo [3/3] Setting up local environment...
if not exist .env (
    copy .env.example .env
    echo Created .env from .env.example
)

echo ========================================================
echo        Med44 Setup Complete! Run start.bat to launch
echo ========================================================
pause
