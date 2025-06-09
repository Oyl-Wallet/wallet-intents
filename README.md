# Wallet Intents

A library for managing wallet intents in Bitcoin wallets, with support for BTC, BRC-20, Runes, and Collectibles.

## Overview

Wallet Intents is a library that helps manage user intents in Bitcoin wallets. It provides a way to track and synchronize transactions, inscriptions, and runes across different addresses.

This repository includes:

1. The original wallet-intents library
2. A new infrastructure for improved performance and scalability

## Performance Improvements

The original implementation of wallet-intents processes all data in the browser extension's runtime, which can cause performance bottlenecks. The new infrastructure moves this processing to a backend service, which provides several benefits:

- Reduced load on the browser extension
- Better data persistence and querying capabilities
- Real-time updates via WebSockets
- Improved scalability

## Repository Structure

- `src/`: Original wallet-intents library
- `infrastructure/`: New backend infrastructure
  - `backend-service/`: Node.js backend service with GraphQL API
  - `client-library/`: Drop-in replacement for the original library
  - `docker/`: Docker configurations for running the infrastructure
  - `schema/`: Database schema definitions

## Getting Started

### Original Library

```typescript
import { 
  IntentManager, 
  IntentSynchronizer, 
  PlasmoStorageAdapter, 
  SandshrewRpcProvider 
} from '@oyl/wallet-intents';

// Initialize the storage adapter
const storage = new PlasmoStorageAdapter('intents/v2');

// Initialize the intent manager
const manager = new IntentManager(storage);

// Initialize the RPC provider
const provider = new SandshrewRpcProvider('https://mainnet.sandshrew.io/v2/default');

// Initialize the synchronizer
const synchronizer = new IntentSynchronizer(manager, provider);

// Start the synchronizer
await synchronizer.start();
```

### New Infrastructure

See the [infrastructure README](./infrastructure/README.md) for details on setting up and using the new infrastructure.

## Migration Guide

The new client library is designed to be a drop-in replacement for the original library. To migrate:

1. Update your dependency to the new version:
```bash
npm install @oyl/wallet-intents@2.0.0
```

2. Update your initialization code to include the backend service configuration:
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
  url: 'https://your-backend-service.com/graphql',
  wsUrl: 'wss://your-backend-service.com/graphql'
};

// Initialize the intent manager
const manager = new IntentManager(storage, backendConfig);

// Initialize the RPC provider
const provider = new BackendRpcProvider(backendConfig);

// Initialize the synchronizer
const synchronizer = new IntentSynchronizer(manager, provider);

// Start the synchronizer
await synchronizer.start();
```

3. The rest of your code should work without changes.

## License

MIT