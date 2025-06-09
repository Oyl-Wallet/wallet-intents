import { EventEmitter } from "events";
import {
  CapturedIntent,
  IntentHandler,
  IntentStatus,
  CapturableIntent,
  StorageAdapter,
  WalletIntent,
  BackendServiceConfig,
} from "./types";
import { GraphQLClient } from "./providers/GraphQLClient";
import { v4 as uuidv4 } from "uuid";

export class IntentManager extends EventEmitter implements IntentHandler {
  private client: GraphQLClient;
  private storage: StorageAdapter;
  private subscriptions: Map<string, () => void> = new Map();

  constructor(storage: StorageAdapter, private config: BackendServiceConfig, public debug = false) {
    super();
    this.storage = storage;
    this.client = new GraphQLClient(config);
    
    // Set up subscriptions for addresses
    this.setupSubscriptions();
  }

  private notifyIntentCaptured(intent: WalletIntent) {
    this.emit("intentCaptured", intent);
  }

  private setupSubscriptions() {
    // This will be set up when addresses are provided
  }

  async captureIntent(
    intent: CapturableIntent<WalletIntent>
  ): Promise<CapturedIntent> {
    if (this.debug) {
      console.log("Capturing intent:", intent);
      return {
        intent: intent as WalletIntent,
        update: async (updates) => {
          console.log("Updating intent:", updates);
          return intent as WalletIntent;
        },
      };
    }

    // First save to local storage for immediate feedback
    const localIntent = await this.storage.save({
      ...intent,
      id: uuidv4(),
      timestamp: Date.now(),
    });

    // Then send to backend
    const mutation = `
      mutation CreateIntent($intent: IntentInput!) {
        createIntent(intent: $intent) {
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
        }
      }
    `;

    try {
      // Send to backend
      const result = await this.client.mutation<{ createIntent: any }>(mutation, {
        intent: {
          ...intent,
          id: localIntent.id,
          timestamp: localIntent.timestamp,
        },
      });

      const backendIntent = result.createIntent;
      
      // Update local storage with backend ID if different
      if (backendIntent && backendIntent.id !== localIntent.id) {
        await this.storage.save({
          ...localIntent,
          id: backendIntent.id,
        });
      }

      this.notifyIntentCaptured(localIntent);

      const update = async (
        updates: Partial<WalletIntent>
      ): Promise<WalletIntent> {
        // First update local storage
        const updatedIntent = await this.storage.save({
          ...localIntent,
          ...updates,
        });

        // Then update backend
        if (updates.status) {
          await this.client.mutation(
            `
            mutation UpdateIntentStatus($id: ID!, $status: IntentStatus!, $reason: String) {
              updateIntentStatus(id: $id, status: $status, reason: $reason) {
                id
                status
                reason
              }
            }
          `,
            {
              id: updatedIntent.id,
              status: updates.status.toUpperCase(),
              reason: updates.reason,
            }
          );
        }

        if (updates.transactionIds && updates.transactionIds.length > 0) {
          for (const txId of updates.transactionIds) {
            if (!localIntent.transactionIds.includes(txId)) {
              await this.client.mutation(
                `
                mutation AddTransactionToIntent($id: ID!, $txid: String!) {
                  addTransactionToIntent(id: $id, txid: $txid) {
                    id
                    transactionIds
                  }
                }
              `,
                {
                  id: updatedIntent.id,
                  txid: txId,
                }
              );
            }
          }
        }

        this.notifyIntentCaptured(updatedIntent);

        return updatedIntent;
      };

      return {
        intent: localIntent,
        update,
      };
    } catch (error) {
      console.error("Error capturing intent in backend:", error);
      
      // Still return the local intent even if backend fails
      this.notifyIntentCaptured(localIntent);
      
      const update = async (
        updates: Partial<WalletIntent>
      ): Promise<WalletIntent> {
        const updatedIntent = await this.storage.save({
          ...localIntent,
          ...updates,
        });
        
        this.notifyIntentCaptured(updatedIntent);
        
        return updatedIntent;
      };
      
      return {
        intent: localIntent,
        update,
      };
    }
  }

  async retrieveAllIntents(): Promise<WalletIntent[]> {
    // First try to get from backend
    try {
      // We don't have a global query for all intents, so we'll use local storage
      return this.storage.findAll();
    } catch (error) {
      console.error("Error retrieving all intents from backend:", error);
      // Fall back to local storage
      return this.storage.findAll();
    }
  }

  async retrievePendingIntentsByAddresses(addresses: string[]): Promise<WalletIntent[]> {
    // Set up subscriptions for these addresses if not already set up
    this.setupAddressSubscriptions(addresses);
    
    try {
      // Try to get from backend first
      const pendingIntents: WalletIntent[] = [];
      
      for (const address of addresses) {
        const query = `
          query GetPendingIntentsByAddress($address: String!) {
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
        
        const result = await this.client.query<{ getIntentsByAddress: any[] }>(query, { address });
        
        // Filter for pending intents
        const addressPendingIntents = result.getIntentsByAddress
          .filter(intent => intent.status.toLowerCase() === IntentStatus.Pending)
          .map(intent => this.transformGraphQLIntent(intent));
        
        pendingIntents.push(...addressPendingIntents);
      }
      
      // Update local storage with backend data
      for (const intent of pendingIntents) {
        await this.storage.save(intent);
      }
      
      return pendingIntents;
    } catch (error) {
      console.error("Error retrieving pending intents from backend:", error);
      // Fall back to local storage
      return this.storage.findByStatusAndAddresses(IntentStatus.Pending, addresses);
    }
  }

  async retrieveIntentsByAddresses(addresses: string[]): Promise<WalletIntent[]> {
    // Set up subscriptions for these addresses if not already set up
    this.setupAddressSubscriptions(addresses);
    
    try {
      // Try to get from backend first
      const allIntents: WalletIntent[] = [];
      
      for (const address of addresses) {
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
        
        const result = await this.client.query<{ getIntentsByAddress: any[] }>(query, { address });
        
        const addressIntents = result.getIntentsByAddress.map(intent => 
          this.transformGraphQLIntent(intent)
        );
        
        allIntents.push(...addressIntents);
      }
      
      // Update local storage with backend data
      for (const intent of allIntents) {
        await this.storage.save(intent);
      }
      
      return allIntents;
    } catch (error) {
      console.error("Error retrieving intents from backend:", error);
      // Fall back to local storage
      return this.storage.findByAddresses(addresses);
    }
  }

  async retrieveIntentById(intentId: string): Promise<WalletIntent | undefined> {
    try {
      // Try to get from backend first
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
      
      const result = await this.client.query<{ getIntentById: any | null }>(query, { id: intentId });
      
      if (result.getIntentById) {
        const intent = this.transformGraphQLIntent(result.getIntentById);
        
        // Update local storage
        await this.storage.save(intent);
        
        return intent;
      }
      
      // If not found in backend, try local storage
      return this.storage.findById(intentId);
    } catch (error) {
      console.error(`Error retrieving intent ${intentId} from backend:`, error);
      // Fall back to local storage
      return this.storage.findById(intentId);
    }
  }

  onIntentCaptured(listener: (intent: WalletIntent) => void): void {
    this.on("intentCaptured", listener);
  }

  private setupAddressSubscriptions(addresses: string[]): void {
    for (const address of addresses) {
      // Skip if already subscribed
      if (this.subscriptions.has(address)) {
        continue;
      }
      
      // Subscribe to intent updates
      const unsubscribeUpdate = this.client.subscribeToIntentUpdates(
        address,
        (intent) => {
          // Update local storage
          this.storage.save(intent).then(() => {
            // Notify listeners
            this.notifyIntentCaptured(intent);
          });
        }
      );
      
      // Subscribe to new intents
      const unsubscribeNew = this.client.subscribeToNewIntents(
        address,
        (intent) => {
          // Update local storage
          this.storage.save(intent).then(() => {
            // Notify listeners
            this.notifyIntentCaptured(intent);
          });
        }
      );
      
      // Store unsubscribe functions
      this.subscriptions.set(address, () => {
        unsubscribeUpdate();
        unsubscribeNew();
      });
    }
  }

  // Helper method to transform GraphQL intent to WalletIntent
  private transformGraphQLIntent(intent: any): WalletIntent {
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
}