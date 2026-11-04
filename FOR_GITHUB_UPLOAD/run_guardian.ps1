# GuardianAI Launch Script
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "       Starting GuardianAI Safety Ecosystem         " -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan

$backendPath = Join-Path $PSScriptRoot "backend"
Set-Location $backendPath

Write-Host "Starting FastAPI Backend and Unified PWA Host on http://127.0.0.1:8000..." -ForegroundColor Green
Start-Process python -ArgumentList "-m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

Start-Sleep -Seconds 2
Start-Process "http://127.0.0.1:8000"
Write-Host "GuardianAI is running! Access via browser or install as PWA." -ForegroundColor Cyan
