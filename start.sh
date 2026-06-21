#!/bin/bash

# Terminate all background processes on exit
trap "kill 0" EXIT

echo "🚀 Starting MediBook Doctor Appointment Platform..."

# Check and install backend dependencies
if [ ! -d "backend/node_modules" ]; then
  echo "📦 Installing backend dependencies..."
  (cd backend && npm install)
fi

# Check and install frontend dependencies
if [ ! -d "frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  (cd frontend && npm install)
fi

echo "🟢 Starting backend API (Port 5000)..."
(cd backend && npm run dev) &
BACKEND_PID=$!

echo "🔵 Starting frontend Next.js (Port 3000)..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
