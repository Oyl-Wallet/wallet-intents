#!/bin/bash

# Setup script for wallet-intents infrastructure

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up wallet-intents infrastructure...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker and try again.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose and try again.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js and try again.${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm and try again.${NC}"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
fi

# Build the client library
echo -e "${GREEN}Building client library...${NC}"
cd infrastructure/client-library
npm install
npm run build
cd ../..

# Build the backend service
echo -e "${GREEN}Building backend service...${NC}"
cd infrastructure/backend-service
npm install
npm run build
cd ../..

# Start the infrastructure
echo -e "${GREEN}Starting infrastructure...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
if docker-compose ps | grep -q "wallet-intents-backend.*Up"; then
    echo -e "${GREEN}Backend service is running.${NC}"
else
    echo -e "${RED}Backend service failed to start. Check the logs with 'docker-compose logs backend-service'.${NC}"
fi

if docker-compose ps | grep -q "wallet-intents-postgres.*Up"; then
    echo -e "${GREEN}PostgreSQL is running.${NC}"
else
    echo -e "${RED}PostgreSQL failed to start. Check the logs with 'docker-compose logs postgres'.${NC}"
fi

if docker-compose ps | grep -q "wallet-intents-kafka.*Up"; then
    echo -e "${GREEN}Kafka is running.${NC}"
else
    echo -e "${RED}Kafka failed to start. Check the logs with 'docker-compose logs kafka'.${NC}"
fi

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${GREEN}The backend service is available at http://localhost:3000${NC}"
echo -e "${GREEN}The GraphQL playground is available at http://localhost:3000/graphql${NC}"
echo -e "${GREEN}The Kafka UI is available at http://localhost:8080${NC}"