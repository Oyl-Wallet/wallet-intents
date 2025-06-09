# Wallet Intents Infrastructure

This directory contains the infrastructure for the Wallet Intents system, which is designed to improve performance by offloading processing from the browser extension to a backend service.

## Overview

The Wallet Intents system consists of the following components:

1. **Backend Service**: A Node.js service that processes transactions, inscriptions, and runes, and provides a GraphQL API for clients to query and subscribe to intents.
2. **Client Library**: A drop-in replacement for the original wallet-intents library that communicates with the backend service.
3. **Infrastructure**: Docker configurations for running the backend service, Kafka, and PostgreSQL.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Oyl Extension  │────▶│  Client Library │────▶│  Backend API    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │                 │
                                               │     Kafka       │
                                               │                 │
                                               └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐                           ┌─────────────────┐
│                 │                           │                 │
│  Sandshrew RPC  │◀──────────────────────────│  Processors     │
│                 │                           │                 │
└─────────────────┘                           └────────┬────────┘
                                                         │
                                                         ▼
                                               ┌─────────────────┐
                                               │                 │
                                               │   PostgreSQL    │
                                               │                 │
                                               └─────────────────┘
```

## Getting Started

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Oyl-Wallet/wallet-intents.git
cd wallet-intents
```

2. Build the client library:
```bash
cd infrastructure/client-library
npm install
npm run build
```

3. Start the infrastructure:
```bash
cd ../docker
docker-compose up -d
```

4. The backend service will be available at http://localhost:3000, and the GraphQL playground at http://localhost:3000/graphql.

## Usage

### Client Library

The client library is a drop-in replacement for the original wallet-intents library. To use it in your project:

```typescript
import { 
  IntentManager, 
  IntentSynchronizer, 
  PlasmoStorageAdapter, 
  BackendRpcProvider 
} from '@oyl/wallet-intents';

// Initialize the storage adapter
const storage = new PlasmoStorageAdapter('intents/v2');

// Configure the backend service
const backendConfig = {
  url: 'http://localhost:3000/graphql',
  wsUrl: 'ws://localhost:3000/graphql'
};

// Initialize the intent manager
const manager = new IntentManager(storage, backendConfig);

// Initialize the RPC provider
const provider = new BackendRpcProvider(backendConfig);

// Initialize the synchronizer
const synchronizer = new IntentSynchronizer(manager, provider);

// Start the synchronizer
await synchronizer.start();

// Use the manager to capture intents
const { intent, update } = await manager.captureIntent({
  address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
  status: 'pending',
  type: 'transaction',
  transactionType: 'send',
  assetType: 'btc',
  transactionIds: ['1234567890abcdef'],
  btcAmount: 0.1,
  amount: 0.1
});

// Update the intent
await update({
  status: 'completed'
});

// Retrieve intents
const intents = await manager.retrieveIntentsByAddresses(['1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa']);
```

### Backend Service

The backend service provides a GraphQL API for querying and subscribing to intents. You can use the GraphQL playground at http://localhost:3000/graphql to explore the API.

Example queries:

```graphql
# Get intents for an address
query {
  getIntentsByAddress(address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa") {
    id
    timestamp
    address
    status
    type
    transactionType
    assetType
    transactionIds
    btcAmount
    ... on BTCTransactionIntent {
      amount
    }
  }
}

# Subscribe to intent updates
subscription {
  intentUpdated(address: "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa") {
    id
    status
    transactionIds
  }
}
```

## Configuration

### Backend Service

The backend service can be configured using environment variables:

- `PORT`: The port to run the server on (default: 3000)
- `DATABASE_URL`: The PostgreSQL connection URL
- `KAFKA_BROKERS`: Comma-separated list of Kafka brokers
- `SANDSHREW_URL`: The URL of the Sandshrew RPC service

### Client Library

The client library can be configured when initializing the `IntentManager`:

```typescript
const manager = new IntentManager(storage, {
  url: 'http://localhost:3000/graphql',
  wsUrl: 'ws://localhost:3000/graphql'
});
```

## Development

### Backend Service

To run the backend service in development mode:

```bash
cd infrastructure/backend-service
npm install
npm run dev
```

### Client Library

To build the client library in watch mode:

```bash
cd infrastructure/client-library
npm install
npm run build -- --watch
```

## License

MIT