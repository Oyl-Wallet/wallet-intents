# Project Brief: Wallet Intents Infrastructure

## Overview

The Wallet Intents Infrastructure project aims to solve performance bottlenecks in the Oyl Wallet extension by moving heavy processing from the browser extension's runtime to a dedicated backend service. The project involves creating a scalable backend architecture with Kafka, PostgreSQL, and GraphQL, along with a drop-in replacement client library that maintains API compatibility with the original wallet-intents library.

## Core Requirements

1. **Performance Improvement**: Offload heavy processing from the browser extension to a backend service to improve responsiveness and user experience.

2. **Scalability**: Create a scalable architecture that can handle increasing numbers of users and transactions.

3. **Real-time Updates**: Implement WebSocket-based real-time updates to eliminate the need for frequent polling.

4. **API Compatibility**: Ensure the new client library is a drop-in replacement for the original wallet-intents library.

5. **Data Persistence**: Store intent data in a PostgreSQL database for efficient querying and retrieval.

6. **Message Processing**: Use Kafka for message processing and event streaming to handle high loads.

## Project Scope

The project includes:

1. **Backend Service**: A Node.js service with GraphQL API and WebSocket subscriptions.

2. **Client Library**: A TypeScript library that implements the same API as the original wallet-intents library.

3. **Docker Infrastructure**: Docker Compose configurations for easy deployment of the backend service, Kafka, and PostgreSQL.

4. **Integration with oyl-extension**: Updates to the oyl-extension to use the new backend service.

## Success Criteria

1. The backend service successfully processes transactions, inscriptions, and runes.
2. The client library maintains API compatibility with the original wallet-intents library.
3. The oyl-extension works with the new backend service without requiring significant changes.
4. Performance is significantly improved compared to the original implementation.
5. The system can handle high loads and scale horizontally.

## Timeline and Milestones

1. **Phase 1**: Design and implement the backend service architecture.
2. **Phase 2**: Implement the client library with API compatibility.
3. **Phase 3**: Set up Docker infrastructure for deployment.
4. **Phase 4**: Update the oyl-extension to use the new backend service.
5. **Phase 5**: Deploy to production at intents.sandshrew.io.

## Stakeholders

- Oyl Wallet development team
- Oyl Wallet users
- Backend infrastructure team