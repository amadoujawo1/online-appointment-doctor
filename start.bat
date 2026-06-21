@echo off
echo 🚀 Starting MediBook Doctor Appointment Platform...

:: Check backend dependencies
if not exist "backend\node_modules\" (
    echo 📦 Installing backend dependencies...
    cd backend && call npm install && cd ..
)

:: Check frontend dependencies
if not exist "frontend\node_modules\" (
    echo 📦 Installing frontend dependencies...
    cd frontend && call npm install && cd ..
)

echo 🟢 Starting backend API in a new window (Port 5000)...
start "MediBook Backend API" cmd /k "cd backend && npm run dev"

echo 🔵 Starting frontend Next.js in a new window (Port 3000)...
start "MediBook Frontend App" cmd /k "cd frontend && npm run dev"

echo 🖥️  Both servers are starting in separate windows. Keep those windows open to run the application.
pause
