@echo off
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" run_all.py %*
) else (
    python run_all.py %*
)
