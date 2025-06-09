import { GraphQLClient as GQLClient } from 'graphql-request';
import { createClient } from 'graphql-ws';
import WebSocket from 'ws';
import { BackendServiceConfig, WalletIntent } from '../types';

export class GraphQLClient {
  private client: GQLClient;
  private wsClient: any;
  private wsUrl: string;

  constructor(config: BackendServiceConfig) {
    this.client = new GQLClient(config.url);
    this.wsUrl = config.wsUrl || config.url.replace(/^http/, 'ws');
    
    // Initialize WebSocket client for subscriptions
    if (typeof window !== 'undefined') {
      // Browser environment
      this.wsClient = createClient({
        url: this.wsUrl,
      });
    } else {
      // Node.js environment
      this.wsClient = createClient({
        url: this.wsUrl,
        webSocketImpl: WebSocket,
      });
    }
  }

  async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    return this.client.request<T>(query, variables);
  }

  async mutation<T>(mutation: string, variables?: Record<string, any>): Promise<T> {
    return this.client.request<T>(mutation, variables);
  }

  subscribe<T>(
    subscription: string,
    variables: Record<string, any>,
    onNext: (data: T) => void,
    onError?: (error: Error) => void
  ): () => void {
    const unsubscribe = this.wsClient.subscribe(
      {
        query: subscription,
        variables,
      },
      {
        next: (result: { data: T }) => {
          if (result.data) {
            onNext(result.data);
          }
        },
        error: (error: Error) => {
          if (onError) {
            onError(error);
          } else {
            console.error('Subscription error:', error);
          }
        },
        complete: () => {
          console.log('Subscription completed');
        },
      }
    );

    return unsubscribe;
  }

  // Intent-specific queries
  async getIntentsByAddress(address: string): Promise<WalletIntent[]> {
    const query = `
      query GetIntentsByAddress($address: String!) {
        getIntentsByAddress(address: $address) {
          id
          timestamp
          address
          status
          reason
          type
          transactionType
          assetType
          transactionIds
          btcAmount
          ... on BTCTransactionIntent {
            amount
          }
          ... on BRC20TransactionIntent {
            ticker
            tickerAmount
            operation
            max
            limit
          }
          ... on RuneEtchingTransactionIntent {
            operation
            runeName
          }
          ... on RuneMintTransactionIntent {
            operation
            runeId
            runeName
            runeAmount
            runeDivisibility
          }
          ... on RuneTransferTransactionIntent {
            operation
            runeId
            runeName
            runeAmount
            runeDivisibility
          }
          ... on CollectibleTransactionIntent {
            inscriptionId
            contentType
            content
            receiverAddress
          }
          ... on BRC20TradeTransactionIntent {
            ticker
            tickerAmount
            totalPrice
          }
          ... on RuneTradeTransactionIntent {
            operation
            runeName
            runeAmount
            totalPrice
          }
          ... on CollectibleTradeTransactionIntent {
            inscriptionId
            contentType
            content
            totalPrice
          }
          ... on CollectibleListTransactionIntent {
            marketplace
            inscriptionId
            collectionName
            inscriptionName
            price
            listingId
          }
          ... on CollectibleClaimTransactionIntent {
            inscriptionId
            imageUrl
            collectionName
          }
        }
      }
    `;

    const result = await this.query<{ getIntentsByAddress: any[] }>(query, { address });
    return this.transformIntents(result.getIntentsByAddress);
  }

  async getIntentById(id: string): Promise<WalletIntent | undefined> {
    const query = `
      query GetIntentById($id: ID!) {
        getIntentById(id: $id) {
          id
          timestamp
          address
          status
          reason
          type
          transactionType
          assetType
          transactionIds
          btcAmount
          ... on BTCTransactionIntent {
            amount
          }
          ... on BRC20TransactionIntent {
            ticker
            tickerAmount
            operation
            max
            limit
          }
          ... on RuneEtchingTransactionIntent {
            operation
            runeName
          }
          ... on RuneMintTransactionIntent {
            operation
            runeId
            runeName
            runeAmount
            runeDivisibility
          }
          ... on RuneTransferTransactionIntent {
            operation
            runeId
            runeName
            runeAmount
            runeDivisibility
          }
          ... on CollectibleTransactionIntent {
            inscriptionId
            contentType
            content
            receiverAddress
          }
          ... on BRC20TradeTransactionIntent {
            ticker
            tickerAmount
            totalPrice
          }
          ... on RuneTradeTransactionIntent {
            operation
            runeName
            runeAmount
            totalPrice
          }
          ... on CollectibleTradeTransactionIntent {
            inscriptionId
            contentType
            content
            totalPrice
          }
          ... on CollectibleListTransactionIntent {
            marketplace
            inscriptionId
            collectionName
            inscriptionName
            price
            listingId
          }
          ... on CollectibleClaimTransactionIntent {
            inscriptionId
            imageUrl
            collectionName
          }
        }
      }
    `;

    const result = await this.query<{ getIntentById: any | null }>(query, { id });
    return result.getIntentById ? this.transformIntent(result.getIntentById) : undefined;
  }

  async updateIntentStatus(id: string, status: string, reason?: string): Promise<WalletIntent> {
    const mutation = `
      mutation UpdateIntentStatus($id: ID!, $status: IntentStatus!, $reason: String) {
        updateIntentStatus(id: $id, status: $status, reason: $reason) {
          id
          status
          reason
        }
      }
    `;

    const result = await this.mutation<{ updateIntentStatus: any }>(mutation, {
      id,
      status,
      reason,
    });

    return this.transformIntent(result.updateIntentStatus);
  }

  async addTransactionToIntent(id: string, txid: string): Promise<WalletIntent> {
    const mutation = `
      mutation AddTransactionToIntent($id: ID!, $txid: String!) {
        addTransactionToIntent(id: $id, txid: $txid) {
          id
          transactionIds
        }
      }
    `;

    const result = await this.mutation<{ addTransactionToIntent: any }>(mutation, {
      id,
      txid,
    });

    return this.transformIntent(result.addTransactionToIntent);
  }

  subscribeToIntentUpdates(address: string, onUpdate: (intent: WalletIntent) => void): () => void {
    const subscription = `
      subscription IntentUpdated($address: String!) {
        intentUpdated(address: $address) {
          id
          timestamp
          address
          status
          reason
          type
          transactionType
          assetType
          transactionIds
          btcAmount
          ... on BTCTransactionIntent {
            amount
          }
          ... on BRC20TransactionIntent {
            ticker
            tickerAmount
            operation
            max
            limit
          }
          ... on RuneEtchingTransactionIntent {
            operation
            runeName
          }
          ... on RuneMintTransactionIntent {
            operation
            runeId
            runeName
            runeAmount
            runeDivisibility
          }
          ... on RuneTransferTransactionIntent {
            operation
            runeId
            runeName
            runeAmount
            runeDivisibility
          }
          ... on CollectibleTransactionIntent {
            inscriptionId
            contentType
            content
            receiverAddress
          }
          ... on BRC20TradeTransactionIntent {
            ticker
            tickerAmount
            totalPrice
          }
          ... on RuneTradeTransactionIntent {
            operation
            runeName
            runeAmount
            totalPrice
          }
          ... on CollectibleTradeTransactionIntent {
            inscriptionId
            contentType
            content
            totalPrice
          }
          ... on CollectibleListTransactionIntent {
            marketplace
            inscriptionId
            collectionName
            inscriptionName
            price
            listingId
          }
          ... on CollectibleClaimTransactionIntent {
            inscriptionId
            imageUrl
            collectionName
          }
        }
      }
    `;

    return this.subscribe<{ intentUpdated: any }>(
      subscription,
      { address },
      (data) => {
        onUpdate(this.transformIntent(data.intentUpdated));
      }
    );
  }

  subscribeToNewIntents(address: string, onNew: (intent: WalletIntent) => void): () => void {
    const subscription = `
      subscription NewIntent($address: String!) {
        newIntent(address: $address) {
          id
          timestamp
          address
          status
          reason
          type
          transactionType
          assetType
          transactionIds
          btcAmount
          ... on BTCTransactionIntent {
            amount
          }
          ... on BRC20TransactionIntent {
            ticker
            tickerAmount
            operation
            max
            limit
          }
          ... on RuneEtchingTransactionIntent {
            operation
            runeName
          }
          ... on RuneMintTransactionIntent {
            operation
            runeId
            runeName
            runeAmount
            runeDivisibility
          }
          ... on RuneTransferTransactionIntent {
            operation
            runeId
            runeName
            runeAmount
            runeDivisibility
          }
          ... on CollectibleTransactionIntent {
            inscriptionId
            contentType
            content
            receiverAddress
          }
          ... on BRC20TradeTransactionIntent {
            ticker
            tickerAmount
            totalPrice
          }
          ... on RuneTradeTransactionIntent {
            operation
            runeName
            runeAmount
            totalPrice
          }
          ... on CollectibleTradeTransactionIntent {
            inscriptionId
            contentType
            content
            totalPrice
          }
          ... on CollectibleListTransactionIntent {
            marketplace
            inscriptionId
            collectionName
            inscriptionName
            price
            listingId
          }
          ... on CollectibleClaimTransactionIntent {
            inscriptionId
            imageUrl
            collectionName
          }
        }
      }
    `;

    return this.subscribe<{ newIntent: any }>(
      subscription,
      { address },
      (data) => {
        onNew(this.transformIntent(data.newIntent));
      }
    );
  }

  // Helper method to transform GraphQL intent to WalletIntent
  private transformIntent(intent: any): WalletIntent {
    // Convert GraphQL enum values to the expected format
    const status = intent.status.toLowerCase();
    const type = intent.type.toLowerCase();
    const transactionType = intent.transactionType.toLowerCase();
    const assetType = intent.assetType.toLowerCase();
    
    // Handle BigInt conversion for rune amounts
    if (intent.runeAmount && typeof intent.runeAmount === 'string') {
      intent.runeAmount = BigInt(intent.runeAmount);
    }
    
    // Create a new intent object with the correct format
    return {
      ...intent,
      status,
      type,
      transactionType,
      assetType,
    } as WalletIntent;
  }

  // Helper method to transform an array of GraphQL intents to WalletIntents
  private transformIntents(intents: any[]): WalletIntent[] {
    return intents.map(intent => this.transformIntent(intent));
  }
}