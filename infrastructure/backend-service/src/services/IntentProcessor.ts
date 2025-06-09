import { Database } from '../db';
import { IntentService } from './IntentService';
import { TransactionService } from './TransactionService';
import { pubsub } from '../websocket/pubsub';

export interface Intent {
  id?: string;
  type: string;
  status: string;
  address: string;
  timestamp: number;
  assetType: string;
  transactionType: string;
  transactionIds: string[];
  btcAmount: number;
  reason?: string;
  [key: string]: any;
}

export class IntentProcessor {
  private intentService: IntentService;
  private transactionService: TransactionService;

  constructor(private db: Database) {
    this.intentService = new IntentService(db);
    this.transactionService = new TransactionService(db);
  }

  async processIntent(intent: Intent): Promise<void> {
    try {
      // Check if the intent already exists
      let existingIntent = null;
      
      if (intent.id) {
        existingIntent = await this.intentService.getIntentById(intent.id);
      }
      
      if (existingIntent) {
        // Update the existing intent
        await this.updateIntent(intent);
      } else {
        // Create a new intent
        await this.createIntent(intent);
      }
      
    } catch (error) {
      console.error('Error processing intent:', error);
      throw error;
    }
  }

  private async createIntent(intent: Intent): Promise<void> {
    try {
      // Create the intent
      const createdIntent = await this.intentService.createIntent(intent);
      
      // Process transactions if any
      if (intent.transactionIds && intent.transactionIds.length > 0) {
        await this.processIntentTransactions(createdIntent);
      }
      
      // Publish intent created event
      pubsub.publish(`NEW_INTENT:${intent.address}`, {
        newIntent: createdIntent,
      });
      
      // Publish activity feed update
      const activityItem = await this.intentService.getActivityFeedItem(createdIntent.id);
      if (activityItem) {
        pubsub.publish(`ACTIVITY_FEED_UPDATED:${intent.address}`, {
          activityFeedUpdated: activityItem,
        });
      }
      
    } catch (error) {
      console.error('Error creating intent:', error);
      throw error;
    }
  }

  private async updateIntent(intent: Intent): Promise<void> {
    try {
      if (!intent.id) {
        throw new Error('Intent ID is required for updates');
      }
      
      // Get the current intent
      const currentIntent = await this.intentService.getIntentById(intent.id);
      
      if (!currentIntent) {
        throw new Error(`Intent with ID ${intent.id} not found`);
      }
      
      // Update the intent status if changed
      if (intent.status && intent.status !== currentIntent.status) {
        await this.intentService.updateIntentStatus(intent.id, intent.status, intent.reason);
      }
      
      // Add new transaction IDs if any
      if (intent.transactionIds && intent.transactionIds.length > 0) {
        for (const txId of intent.transactionIds) {
          if (!currentIntent.transactionIds.includes(txId)) {
            await this.intentService.addTransactionToIntent(intent.id, txId);
          }
        }
        
        // Process the transactions
        await this.processIntentTransactions({
          ...currentIntent,
          transactionIds: [
            ...currentIntent.transactionIds,
            ...intent.transactionIds.filter(txId => !currentIntent.transactionIds.includes(txId)),
          ],
        });
      }
      
      // Get the updated intent
      const updatedIntent = await this.intentService.getIntentById(intent.id);
      
      if (updatedIntent) {
        // Publish intent updated event
        pubsub.publish(`INTENT_UPDATED:${updatedIntent.address}`, {
          intentUpdated: updatedIntent,
        });
        
        // Publish activity feed update
        const activityItem = await this.intentService.getActivityFeedItem(updatedIntent.id);
        if (activityItem) {
          pubsub.publish(`ACTIVITY_FEED_UPDATED:${updatedIntent.address}`, {
            activityFeedUpdated: activityItem,
          });
        }
      }
      
    } catch (error) {
      console.error('Error updating intent:', error);
      throw error;
    }
  }

  private async processIntentTransactions(intent: Intent): Promise<void> {
    try {
      // Check if all transactions are confirmed
      const transactions = await Promise.all(
        intent.transactionIds.map(txId => this.transactionService.getTransactionById(txId))
      );
      
      const allConfirmed = transactions.every(tx => tx && tx.confirmed);
      
      // If all transactions are confirmed, update the intent status to completed
      if (allConfirmed && intent.status !== 'COMPLETED') {
        await this.intentService.updateIntentStatus(intent.id!, 'COMPLETED');
        
        // Publish intent updated event
        pubsub.publish(`INTENT_UPDATED:${intent.address}`, {
          intentUpdated: {
            ...intent,
            status: 'COMPLETED',
          },
        });
        
        // Publish activity feed update
        const activityItem = await this.intentService.getActivityFeedItem(intent.id!);
        if (activityItem) {
          pubsub.publish(`ACTIVITY_FEED_UPDATED:${intent.address}`, {
            activityFeedUpdated: {
              ...activityItem,
              status: 'COMPLETED',
            },
          });
        }
      }
      
    } catch (error) {
      console.error('Error processing intent transactions:', error);
      throw error;
    }
  }
}