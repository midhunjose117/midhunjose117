#!/bin/bash

# AI Calendar Assistant Quick Start Script

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Welcome to AI Calendar Assistant Setup!${NC}"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}Please edit backend/.env with your API keys and credentials${NC}"
    echo "Required keys:"
    echo "  - OPENAI_API_KEY"
    echo "  - GOOGLE_MAPS_API_KEY" 
    echo "  - CALDAV credentials"
    echo ""
    read -p "Press enter after you've updated the .env file..."
fi

# Start services
echo -e "${GREEN}Starting services with Docker Compose...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${GREEN}Waiting for services to be ready...${NC}"
sleep 10

# Run database migrations
echo -e "${GREEN}Running database migrations...${NC}"
docker-compose exec backend alembic upgrade head

# Show status
echo ""
echo -e "${GREEN}✅ AI Calendar Assistant is now running!${NC}"
echo ""
echo "Access the application:"
echo "  - Frontend: http://localhost"
echo "  - API Documentation: http://localhost:8000/api/docs"
echo ""
echo "Default ports:"
echo "  - Frontend: 3000"
echo "  - Backend API: 8000"
echo "  - PostgreSQL: 5432"
echo "  - Redis: 6379"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
echo -e "${GREEN}Happy scheduling! 📅${NC}"