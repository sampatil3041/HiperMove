#!/usr/bin/env bash
# HiperMove One-Command Startup Script
export PATH="$HOME/.local/bin:$PATH"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "============================================="
echo "   Starting HiperMove Movement Assistant     "
echo "============================================="

# 1. Start backend server
echo "🚀 Starting Backend on http://localhost:3001..."
(cd "$DIR/backend" && node src/server.js) &
BACKEND_PID=$!

# 2. Wait a moment for backend to initialize
sleep 1

# 3. Start frontend dev server
echo "⚡ Starting Frontend on http://localhost:3000..."
(cd "$DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

# Trap Ctrl+C to shut down both cleanly
cleanup() {
  echo ""
  echo "Shutting down HiperMove servers..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT
wait
