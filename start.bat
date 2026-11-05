@echo off
title Unit 600 Studio
color 0A
cd /d "%~dp0"

echo ============================================================
echo   UNIT 600 SIMULATION STUDIO
echo ============================================================
echo.

REM ---- 1) Check frontend build ----
if not exist "dist\index.html" (
    echo [1/3] Building frontend for the first time...
    call npm install
    call npm run build
    if errorlevel 1 (
        echo.
        echo [ERROR] Frontend build failed.
        pause
        exit /b 1
    )
) else (
    echo [1/3] Frontend already built - skipping
)

REM ---- 2) Sync dist to backend ----
echo [2/3] Syncing frontend to backend...
if not exist "backend\dist" mkdir "backend\dist"
xcopy /E /Y /I /Q "dist\*" "backend\dist\" > nul

REM ---- 3) Setup Python venv if needed ----
if not exist "backend\venv\Scripts\python.exe" (
    echo [3/3] Setting up Python environment for the first time...
    pushd backend
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install --quiet -r requirements.txt
    popd
) else (
    echo [3/3] Python environment ready
)

echo.
echo ============================================================
echo   Starting server...
echo   Your browser will open automatically.
echo   Close this window to stop the server.
echo ============================================================
echo.

cd backend
call venv\Scripts\activate.bat
python main.py

echo.
echo Server stopped.
pause