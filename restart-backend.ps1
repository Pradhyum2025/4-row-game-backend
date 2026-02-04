# Backend Restart Script for PowerShell
# Run this from the backend directory

Write-Host "Stopping any existing backend processes..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like '*go*'} | Where-Object {$_.Path -like '*4-row-game*'} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host "Setting environment variables..." -ForegroundColor Yellow
$env:DATABASE_URL="postgres://postgres:postgres@localhost:5432/connectfour?sslmode=disable"
$env:KAFKA_BROKER="localhost:9092"
$env:KAFKA_TOPIC="game-events"
$env:PORT="8080"

Write-Host "Starting backend server..." -ForegroundColor Green
Write-Host "You should see 'Server starting on port 8080' below:" -ForegroundColor Gray
Write-Host ""

go run cmd/server/main.go
