# System Patterns: Wallet Intents Infrastructure

## Architecture Overview

The Wallet Intents Infrastructure follows a microservices architecture with the following components:

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

## Key Design Patterns

### 1. API Gateway Pattern

The Backend API serves as an API Gateway, providing a unified interface for the client library to interact with the backend services. It handles:

- GraphQL queries and mutations
- WebSocket subscriptions
- Authentication and authorization
- Request routing

### 2. Event Sourcing Pattern

The system uses Kafka as an event store, with events representing changes to the system state:

- Transaction events
- Inscription events
- Rune events
- Intent events

These events are processed by the appropriate processors and stored in the database.

### 3. CQRS (Command Query Responsibility Segregation)

The system separates commands (writes) from queries (reads):

- **Commands**: Processed through Kafka for asynchronous handling
- **Queries**: Served directly from the database for fast reads

### 4. Repository Pattern

The system uses repositories to abstract the data access layer:

- IntentRepository
- TransactionRepository
- InscriptionRepository
- RuneRepository

### 5. Adapter Pattern

The client library uses adapters to abstract the storage and communication mechanisms:

- PlasmoStorageAdapter: For browser storage
- BackendRpcProvider: For communication with the backend service

### 6. Observer Pattern

The system uses the observer pattern for real-time updates:

- WebSocket subscriptions for real-time updates
- Event emitters for local updates

## Component Relationships

### Client Library Components

1. **IntentManager**: Manages intents and communicates with the backend service
2. **IntentSynchronizer**: Synchronizes intents between the client and backend
3. **StorageAdapter**: Abstracts the storage mechanism
4. **RpcProvider**: Abstracts the communication with the backend service

### Backend Service Components

1. **GraphQL API**: Provides a GraphQL API for the client library
2. **WebSocket Server**: Provides real-time updates via WebSockets
3. **Kafka Consumers**: Process events from Kafka
4. **Service Processors**:
   - TransactionProcessor: Processes transaction events
   - InscriptionProcessor: Processes inscription events
   - RuneProcessor: Processes rune events
   - IntentProcessor: Processes intent events
5. **Repositories**: Abstract the data access layer

## Critical Implementation Paths

### Intent Capture Flow

1. Client captures an intent via IntentManager.captureIntent()
2. Intent is stored locally via StorageAdapter
3. Intent is sent to the backend service via GraphQL mutation
4. Backend service stores the intent in the database
5. Backend service publishes an intent event to Kafka
6. IntentProcessor processes the intent event
7. Backend service sends a real-time update via WebSocket
8. Client receives the update and updates the UI

### Intent Synchronization Flow

1. Client calls IntentSynchronizer.syncIntentsFromChain()
2. Client sends a GraphQL query to fetch intents for specific addresses
3. Backend service queries the database for intents
4. Backend service returns the intents to the client
5. Client updates local storage with the fetched intents
6. Client subscribes to real-time updates for the addresses
7. Backend service sends updates via WebSocket when intents change
8. Client receives updates and updates the UI

### Transaction Processing Flow

1. Backend service fetches transactions from Sandshrew RPC
2. Backend service publishes transaction events to Kafka
3. TransactionProcessor processes the transaction events
4. TransactionProcessor extracts inscriptions and runes from transactions
5. TransactionProcessor publishes inscription and rune events to Kafka
6. InscriptionProcessor and RuneProcessor process these events
7. Processors update the database with the processed data
8. Backend service sends real-time updates via WebSocket
9. Client receives updates and updates the UI