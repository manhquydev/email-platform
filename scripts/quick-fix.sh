#!/bin/bash

# =============================================================================
# QUICK-FIX.SH - Fix common Docker issues quickly
# =============================================================================
# Usage: ./scripts/quick-fix.sh [issue]
#
# Issues:
#   migration   - Run database migrations
#   network     - Fix network/orphan issues  
#   restart     - Restart all services
#   logs        - Show API logs
#   health      - Check service health
# =============================================================================

COMPOSE_FILE="docker-compose.prod.yml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

case "${1:-help}" in
    migration|migrate)
        echo -e "${YELLOW}🔄 Running database migrations...${NC}"
        API_CONTAINER=$(docker compose -f $COMPOSE_FILE ps --format '{{.Name}}' | grep api)
        docker exec -it "$API_CONTAINER" npx prisma migrate deploy
        echo -e "${GREEN}✅ Migrations completed${NC}"
        ;;
        
    network|orphan)
        echo -e "${YELLOW}🔧 Fixing network issues...${NC}"
        docker compose -f $COMPOSE_FILE down --remove-orphans
        docker network prune -f
        docker compose -f $COMPOSE_FILE up -d
        echo -e "${GREEN}✅ Network fixed, services restarted${NC}"
        ;;
        
    restart)
        echo -e "${YELLOW}🔄 Restarting all services...${NC}"
        docker compose -f $COMPOSE_FILE restart
        echo -e "${GREEN}✅ All services restarted${NC}"
        ;;
        
    logs)
        echo -e "${YELLOW}📋 Showing API logs...${NC}"
        docker compose -f $COMPOSE_FILE logs -f --tail=50 api
        ;;
        
    health|status)
        echo -e "${YELLOW}🏥 Checking service health...${NC}"
        docker compose -f $COMPOSE_FILE ps
        echo ""
        echo "Testing API health endpoint..."
        curl -s https://api.manhquy.id.vn/health || echo -e "${RED}API not responding${NC}"
        ;;
        
    rebuild)
        echo -e "${YELLOW}🔨 Rebuilding API image...${NC}"
        docker compose -f $COMPOSE_FILE build api
        docker compose -f $COMPOSE_FILE up -d api
        echo -e "${GREEN}✅ API rebuilt and restarted${NC}"
        ;;
        
    *)
        echo "Quick-Fix Script for Email Platform"
        echo ""
        echo "Usage: ./scripts/quick-fix.sh [command]"
        echo ""
        echo "Commands:"
        echo "  migration  - Run database migrations inside container"
        echo "  network    - Fix orphan containers and network issues"
        echo "  restart    - Restart all services"
        echo "  rebuild    - Rebuild and restart API"
        echo "  logs       - Show API logs (follow mode)"
        echo "  health     - Check service health status"
        ;;
esac
