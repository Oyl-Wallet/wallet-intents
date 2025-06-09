#!/bin/bash

# Deployment script for wallet-intents backend service
# This script is designed to be run on the server at intents.sandshrew.io

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Deploying wallet-intents backend service to intents.sandshrew.io...${NC}"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    
    # Update the .env file with production settings
    sed -i 's/PORT=3000/PORT=8080/' .env
    sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env
    
    echo -e "${YELLOW}Please update the .env file with your production settings.${NC}"
    echo -e "${YELLOW}Press Enter to continue when ready...${NC}"
    read
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

# Start the infrastructure with Docker Compose
echo -e "${GREEN}Starting infrastructure...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Check if services are running
if docker-compose -f docker-compose.prod.yml ps | grep -q "wallet-intents-backend.*Up"; then
    echo -e "${GREEN}Backend service is running.${NC}"
else
    echo -e "${RED}Backend service failed to start. Check the logs with 'docker-compose -f docker-compose.prod.yml logs backend-service'.${NC}"
fi

if docker-compose -f docker-compose.prod.yml ps | grep -q "wallet-intents-postgres.*Up"; then
    echo -e "${GREEN}PostgreSQL is running.${NC}"
else
    echo -e "${RED}PostgreSQL failed to start. Check the logs with 'docker-compose -f docker-compose.prod.yml logs postgres'.${NC}"
fi

if docker-compose -f docker-compose.prod.yml ps | grep -q "wallet-intents-kafka.*Up"; then
    echo -e "${GREEN}Kafka is running.${NC}"
else
    echo -e "${RED}Kafka failed to start. Check the logs with 'docker-compose -f docker-compose.prod.yml logs kafka'.${NC}"
fi

echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}The backend service is available at http://localhost:8080${NC}"
echo -e "${GREEN}Make sure your Nginx is configured to proxy requests to http://localhost:8080${NC}"

# Provide Nginx configuration example
echo -e "${YELLOW}Example Nginx configuration:${NC}"
echo -e "${YELLOW}----------------------------${NC}"
echo -e "${YELLOW}server {${NC}"
echo -e "${YELLOW}    listen 80;${NC}"
echo -e "${YELLOW}    server_name intents.sandshrew.io;${NC}"
echo -e "${YELLOW}    ${NC}"
echo -e "${YELLOW}    location / {${NC}"
echo -e "${YELLOW}        proxy_pass http://localhost:8080;${NC}"
echo -e "${YELLOW}        proxy_http_version 1.1;${NC}"
echo -e "${YELLOW}        proxy_set_header Upgrade \$http_upgrade;${NC}"
echo -e "${YELLOW}        proxy_set_header Connection \"upgrade\";${NC}"
echo -e "${YELLOW}        proxy_set_header Host \$host;${NC}"
echo -e "${YELLOW}        proxy_set_header X-Real-IP \$remote_addr;${NC}"
echo -e "${YELLOW}        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;${NC}"
echo -e "${YELLOW}        proxy_set_header X-Forwarded-Proto \$scheme;${NC}"
echo -e "${YELLOW}    }${NC}"
echo -e "${YELLOW}}${NC}"
echo -e "${YELLOW}${NC}"
echo -e "${YELLOW}# Don't forget to set up SSL with Let's Encrypt:${NC}"
echo -e "${YELLOW}# certbot --nginx -d intents.sandshrew.io${NC}"