#!/bin/bash
# System2ML Startup Script
# Run with: ./start.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Options
SKIP_REDIS=false
SKIP_CELERY=false
API_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-redis) SKIP_REDIS=true; shift ;;
        --skip-celery) SKIP_CELERY=true; shift ;;
        --api-only) API_ONLY=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

echo -e "${YELLOW}
╔═══════════════════════════════════════════════════════════════╗
║           System2ML - Starting All Services                  ║
╚═══════════════════════════════════════════════════════════════╝${NC}"

# Step 1: Redis
if [ "$SKIP_REDIS" = false ]; then
    echo -e "${CYAN}=== Starting Redis ===${NC}"
    docker start redis 2>/dev/null
    PONG=$(docker exec redis redis-cli ping 2>/dev/null)
    if [ "$PONG" = "PONG" ]; then
        echo -e "${GREEN}Redis: PONG ✓${NC}"
    else
        echo -e "${RED}Redis: Failed to start${NC}"
    fi
fi

# Step 2: Celery Worker
if [ "$API_ONLY" = false ] && [ "$SKIP_CELERY" = false ]; then
    echo -e "${CYAN}=== Starting Celery Worker ===${NC}"
    cd "$(dirname "$0")"
    celery -A agent.tasks worker --loglevel=info &
    echo -e "${GREEN}Celery Worker started ✓${NC}"
fi

# Step 3: API Server
echo -e "${CYAN}=== Starting API Server ===${NC}"
cd "$(dirname "$0")"
python -m ui.api

echo -e "${YELLOW}
╔═══════════════════════════════════════════════════════════════╗
║  All services started!                                         ║
║                                                                 ║
║  API:     http://localhost:8000                               ║
║  Docs:    http://localhost:8000/docs                           ║
║  Redis:   localhost:6379                                        ║
╚═══════════════════════════════════════════════════════════════╝${NC}"
