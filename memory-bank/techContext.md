# Technical Context: Wallet Intents Infrastructure

## Technologies Used

### Backend Service

1. **Node.js**: Runtime environment for the backend service
2. **TypeScript**: Programming language for type safety and better developer experience
3. **Express**: Web framework for handling HTTP requests
4. **GraphQL**: API query language for flexible and efficient data fetching
   - Apollo Server: GraphQL server implementation
   - GraphQL Subscriptions: For real-time updates
5. **WebSockets**: For real-time communication between client and server
   - graphql-ws: WebSocket implementation for GraphQL subscriptions
6. **Kafka**: Message broker for event streaming and processing
   - KafkaJS: Kafka client for Node.js
7. **PostgreSQL**: Relational database for storing intents, transactions, inscriptions, and runes
   - pg-promise: PostgreSQL client for Node.js
8. **Docker**: Containerization for easy deployment and scaling
   - Docker Compose: For orchestrating multi-container applications

### Client Library

1. **TypeScript**: Programming language for type safety and better developer experience
2. **GraphQL**: API query language for flexible and efficient data fetching
   - graphql-request: GraphQL client for making requests
3. **WebSockets**: For real-time communication with the backend service
   - graphql-ws: WebSocket client for GraphQL subscriptions
4. **Plasmo Storage**: Browser storage adapter for the Plasmo browser extension framework
5. **UUID**: For generating unique identifiers

## Development Setup

### Prerequisites

1. Node.js 18+
2. Docker and Docker Compose
3. PostgreSQL client (optional, for direct database access)
4. Kafka tools (optional, for monitoring Kafka)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Oyl-Wallet/wallet-intents.git
   cd wallet-intents
   ```

2. Install dependencies:
   ```bash
   # For the client library
   cd infrastructure/client-library
   npm install
   
   # For the backend service
   cd ../backend-service
   npm install
   ```

3. Start the infrastructure:
   ```bash
   cd ../..
   docker-compose up -d
   ```

4. Build the client library:
   ```bash
   cd infrastructure/client-library
   npm run build
   ```

5. Start the backend service:
   ```bash
   cd ../backend-service
   npm run dev
   ```

### Production Deployment

1. Clone the repository on the server:
   ```bash
   git clone https://github.com/Oyl-Wallet/wallet-intents.git
   cd wallet-intents
   ```

2. Run the deployment script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. Configure Nginx as a reverse proxy:
   ```nginx
   server {
       listen 80;
       server_name intents.sandshrew.io;
       
       location / {
           proxy_pass http://localhost:8080;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. Set up SSL with Let's Encrypt:
   ```bash
   sudo certbot --nginx -d intents.sandshrew.io
   ```

## Technical Constraints

1. **Browser Extension Limitations**:
   - Limited storage capacity
   - Background script execution limitations
   - Content security policy restrictions

2. **API Compatibility**:
   - Must maintain API compatibility with the original wallet-intents library
   - Must support the same intent types and operations

3. **Network Constraints**:
   - Must handle network interruptions gracefully
   - Must provide offline functionality with local storage fallback

4. **Security Constraints**:
   - Must secure communication between client and server
   - Must validate all input data
   - Must handle authentication and authorization

## Dependencies

### External Services

1. **Sandshrew JSONRPC Service**: Provides access to Bitcoin blockchain data
   - URL: https://mainnet.sandshrew.io/v2/default
   - Methods:
     - esplora_address::txs: Get transactions for an address
     - esplora_tx: Get transaction details
     - ord_output: Get output details
     - ord_inscription: Get inscription details
     - ord_content: Get inscription content
     - ord_rune: Get rune details

2. **Ord**: Bitcoin Ordinals indexer (accessed through Sandshrew)

3. **Electrs**: Bitcoin Electrum server (accessed through Sandshrew)

### Internal Dependencies

1. **@plasmohq/storage**: Storage adapter for Plasmo browser extensions
2. **@magiceden-oss/runestone-lib**: Library for working with Runes

## Tool Usage Patterns

### Docker Compose

Used for:
- Local development environment
- Production deployment
- Managing multiple containers (PostgreSQL, Kafka, ZooKeeper, Backend Service)

### GraphQL

Used for:
- Querying intents, transactions, inscriptions, and runes
- Creating and updating intents
- Subscribing to real-time updates

### Kafka

Used for:
- Processing transactions asynchronously
- Handling high volumes of events
- Ensuring reliable message delivery

### PostgreSQL

Used for:
- Storing intents, transactions, inscriptions, and runes
- Efficient querying with proper indexing
- Data persistence across restarts