# Active Context: Wallet Intents Infrastructure

## Current Focus

The current focus is on implementing and deploying the Wallet Intents Infrastructure to address performance bottlenecks in the Oyl Wallet extension. We have:

1. Created a backend service with GraphQL API and WebSocket subscriptions
2. Implemented a client library that maintains API compatibility with the original wallet-intents library
3. Set up Docker infrastructure for easy deployment
4. Updated the oyl-extension to use the new backend service at https://intents.sandshrew.io

## Recent Changes

1. **Backend Service Implementation**:
   - Created a Node.js service with Express, GraphQL, and WebSockets
   - Implemented Kafka consumers for processing transactions, inscriptions, and runes
   - Set up PostgreSQL database with proper schema and indexing
   - Created service processors for handling different types of data

2. **Client Library Implementation**:
   - Created a drop-in replacement for the original wallet-intents library
   - Implemented GraphQL client for communication with the backend service
   - Added WebSocket support for real-time updates
   - Maintained local storage fallback for offline operation

3. **Docker Infrastructure**:
   - Created Docker Compose configurations for development and production
   - Set up containers for PostgreSQL, Kafka, ZooKeeper, and the backend service
   - Created deployment scripts for easy setup

4. **oyl-extension Integration**:
   - Updated package.json to use the kungfuflex/wallet-intents#backend branch
   - Modified IntentSynchronizerService.ts and IntentsService.ts to use the new backend service
   - Updated content security policy to allow WebSocket connections to intents.sandshrew.io

## Next Steps

1. **Deploy to Production**:
   - Deploy the backend service to intents.sandshrew.io
   - Configure Nginx as a reverse proxy
   - Set up SSL with Let's Encrypt
   - Verify the deployment with the GraphQL playground

2. **Testing and Validation**:
   - Test the integration with the oyl-extension
   - Validate performance improvements
   - Ensure all intent types and operations work correctly

3. **Monitoring and Maintenance**:
   - Set up monitoring for the backend service
   - Implement logging for debugging and troubleshooting
   - Create backup and recovery procedures

4. **Documentation**:
   - Update the README with deployment instructions
   - Document the API for future reference
   - Create user guides for the oyl-extension team

## Active Decisions and Considerations

1. **Architecture Decisions**:
   - Using Kafka for message processing to handle high loads
   - Using PostgreSQL for data storage with proper indexing
   - Using GraphQL for flexible and efficient data fetching
   - Using WebSockets for real-time updates

2. **API Compatibility**:
   - Maintaining the same API as the original wallet-intents library
   - Supporting the same intent types and operations
   - Providing the same event emitters for notifications

3. **Performance Considerations**:
   - Offloading heavy processing to the backend service
   - Using efficient database queries with proper indexing
   - Minimizing network requests with GraphQL
   - Using WebSockets for real-time updates instead of polling

4. **Security Considerations**:
   - Securing communication with HTTPS and WSS
   - Validating all input data
   - Implementing proper error handling
   - Protecting against common web vulnerabilities

## Learnings and Project Insights

1. **Performance Bottlenecks**:
   - The original implementation was bottlenecked by processing all data in the browser extension's runtime
   - Using browser storage for all data with full scans for every query was inefficient
   - Direct calls to the sandshrew jsonrpc service for every operation created unnecessary network traffic
   - Synchronous processing blocked the UI

2. **Architecture Improvements**:
   - Moving heavy processing to a dedicated backend service significantly improves performance
   - Using a proper database with indexing makes queries much faster
   - Using Kafka for message processing allows for asynchronous handling of events
   - Using WebSockets for real-time updates eliminates the need for frequent polling

3. **Integration Challenges**:
   - Maintaining API compatibility while changing the underlying implementation
   - Handling network interruptions and offline operation
   - Ensuring data consistency between client and server
   - Managing WebSocket connections and reconnections

4. **Future Considerations**:
   - Horizontal scaling for handling increasing load
   - Multi-tenancy for supporting multiple wallet extensions or applications
   - Analytics for monitoring usage and performance
   - Support for additional asset types beyond BTC, BRC-20, Runes, and Collectibles