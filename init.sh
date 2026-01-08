#!/bin/bash

# Callify - Development Environment Setup Script
# This script sets up and runs the Callify development environment

set -e

echo "=================================="
echo "  Callify Development Setup"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for Node.js
check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✓ Node.js found: ${NODE_VERSION}${NC}"

        # Check if version is 18+
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$NODE_MAJOR" -lt 18 ]; then
            echo -e "${RED}✗ Node.js 18+ required. Current: ${NODE_VERSION}${NC}"
            exit 1
        fi
    else
        echo -e "${RED}✗ Node.js not found. Please install Node.js 18+${NC}"
        exit 1
    fi
}

# Check for npm
check_npm() {
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        echo -e "${GREEN}✓ npm found: ${NPM_VERSION}${NC}"
    else
        echo -e "${RED}✗ npm not found. Please install npm${NC}"
        exit 1
    fi
}

# Install backend dependencies
install_backend() {
    echo ""
    echo "Installing backend dependencies..."
    if [ -d "backend" ]; then
        cd backend
        npm install
        cd ..
        echo -e "${GREEN}✓ Backend dependencies installed${NC}"
    else
        echo -e "${YELLOW}! Backend directory not found - will be created during implementation${NC}"
    fi
}

# Install frontend dependencies
install_frontend() {
    echo ""
    echo "Installing frontend dependencies..."
    if [ -d "frontend" ]; then
        cd frontend
        npm install
        cd ..
        echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
    else
        echo -e "${YELLOW}! Frontend directory not found - will be created during implementation${NC}"
    fi
}

# Initialize database
init_database() {
    echo ""
    echo "Initializing database..."
    if [ -f "backend/src/db/init.ts" ]; then
        cd backend
        npm run db:init 2>/dev/null || echo -e "${YELLOW}! Database init script not ready yet${NC}"
        cd ..
    else
        echo -e "${YELLOW}! Database initialization will be set up during implementation${NC}"
    fi
}

# Start development servers
start_servers() {
    echo ""
    echo "Starting development servers..."

    # Check if backend exists and start it
    if [ -d "backend" ] && [ -f "backend/package.json" ]; then
        echo "Starting backend server..."
        cd backend
        npm run dev &
        BACKEND_PID=$!
        cd ..
        echo -e "${GREEN}✓ Backend starting on http://localhost:3001${NC}"
    fi

    # Check if frontend exists and start it
    if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
        echo "Starting frontend server..."
        cd frontend
        npm run dev &
        FRONTEND_PID=$!
        cd ..
        echo -e "${GREEN}✓ Frontend starting on http://localhost:5173${NC}"
    fi
}

# Show helpful information
show_info() {
    echo ""
    echo "=================================="
    echo "  Callify Development Environment"
    echo "=================================="
    echo ""
    echo "Access the application:"
    echo "  - Frontend: http://localhost:5173"
    echo "  - Backend API: http://localhost:3001/api"
    echo ""
    echo "Default test credentials (after seeding):"
    echo "  - Admin: admin / admin123"
    echo "  - Agent: agent / agent123"
    echo ""
    echo "Useful commands:"
    echo "  - Stop servers: Ctrl+C"
    echo "  - Run tests: npm test (in frontend or backend)"
    echo "  - Build: npm run build (in frontend or backend)"
    echo ""
    echo "Environment variables needed:"
    echo "  - OPENAI_API_KEY: For transcription and AI analysis"
    echo "  - TWILIO_* or TELNYX_*: For telephony webhooks (optional)"
    echo ""
}

# Main execution
main() {
    echo "Checking prerequisites..."
    check_node
    check_npm

    install_backend
    install_frontend
    init_database

    show_info

    # Ask if user wants to start servers
    if [ "$1" == "--start" ] || [ "$1" == "-s" ]; then
        start_servers

        echo "Press Ctrl+C to stop all servers..."

        # Wait for user interrupt
        trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
        wait
    else
        echo "To start the development servers, run:"
        echo "  ./init.sh --start"
        echo ""
        echo "Or start them manually:"
        echo "  cd backend && npm run dev"
        echo "  cd frontend && npm run dev"
    fi
}

# Run main function
main "$@"
