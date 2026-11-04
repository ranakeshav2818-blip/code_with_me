@echo off
echo ===================================================
echo     Starting GuardianAI Safety Ecosystem
echo ===================================================
echo [1/2] Verifying Python & Node environment...
cd /d %~dp0\backend
start "GuardianAI Backend & PWA Server" cmd /k "python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
echo [2/2] GuardianAI is live at: http://127.0.0.1:8000
start http://127.0.0.1:8000
