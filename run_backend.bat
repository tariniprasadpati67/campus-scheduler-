@echo off
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
)

