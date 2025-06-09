# Product Context: Wallet Intents Infrastructure

## Problem Statement

The Oyl Wallet extension is experiencing performance bottlenecks due to heavy processing in the browser extension's runtime. The current implementation of wallet-intents processes all data (transactions, inscriptions, runes) directly in the extension, which causes:

1. **Slow UI Responsiveness**: Heavy processing blocks the main thread, leading to a sluggish user experience.
2. **Inefficient Storage**: Using browser storage for all data with full scans for every query is inefficient.
3. **Frequent API Calls**: Direct calls to the sandshrew jsonrpc service for every operation creates unnecessary network traffic.
4. **Synchronous Processing**: All processing is done synchronously, blocking the UI.

## Solution Overview

The Wallet Intents Infrastructure solves these problems by:

1. **Offloading Processing**: Moving heavy processing to a dedicated backend service.
2. **Efficient Database**: Using PostgreSQL with proper indexing for efficient querying.
3. **Message Queue**: Using Kafka to buffer and process messages asynchronously.
4. **Real-time Updates**: Using WebSockets for efficient real-time updates instead of polling.

## User Experience Goals

From the user's perspective, the Oyl Wallet extension should:

1. **Be More Responsive**: The UI should remain responsive even when processing large amounts of data.
2. **Show Real-time Updates**: Users should see updates to their wallet intents in real-time without manual refreshing.
3. **Work Offline**: The extension should still function when offline, with local storage fallback.
4. **Maintain Consistency**: The user experience should be consistent with the previous version, just faster and more reliable.

## Integration Points

The Wallet Intents Infrastructure integrates with:

1. **Oyl Wallet Extension**: The extension uses the client library to communicate with the backend service.
2. **Sandshrew JSONRPC Service**: The backend service communicates with the sandshrew jsonrpc service to fetch transaction data.
3. **Ord and Electrs**: The backend service indirectly uses these services through the sandshrew jsonrpc service.

## Workflow

The typical workflow for the Wallet Intents Infrastructure is:

1. **User Action**: The user performs an action in the Oyl Wallet extension (e.g., sending BTC, viewing transactions).
2. **Client Library**: The client library captures the intent and sends it to the backend service.
3. **Backend Processing**: The backend service processes the intent, fetches necessary data from the sandshrew jsonrpc service, and stores the result in the database.
4. **Real-time Updates**: The backend service sends real-time updates to the client library via WebSockets.
5. **UI Update**: The client library updates the UI with the latest data.

## Key Metrics

The success of the Wallet Intents Infrastructure will be measured by:

1. **Response Time**: How quickly the UI responds to user actions.
2. **Processing Time**: How long it takes to process intents.
3. **Scalability**: How well the system handles increasing numbers of users and transactions.
4. **Reliability**: How often the system experiences errors or downtime.

## Future Considerations

1. **Horizontal Scaling**: The backend service should be designed to scale horizontally to handle increasing load.
2. **Multi-tenancy**: The backend service should support multiple wallet extensions or applications.
3. **Analytics**: The backend service could provide analytics on wallet usage and transaction patterns.
4. **Additional Asset Types**: The system should be extensible to support new asset types beyond BTC, BRC-20, Runes, and Collectibles.