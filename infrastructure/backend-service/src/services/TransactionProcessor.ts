import { Database } from '../db';
import { TransactionService } from './TransactionService';
import { IntentService } from './IntentService';
import { pubsub } from '../websocket/pubsub';

export class TransactionProcessor {
  private transactionService: TransactionService;
  private intentService: IntentService;

  constructor(private db: Database) {
    this.transactionService = new TransactionService(db);
    this.intentService = new IntentService(db);
  }

  async processTransaction(transaction: any): Promise<void> {
    try {
      // Save the transaction to the database
      const savedTransaction = await this.transactionService.saveTransaction(transaction);
      
      // Check if there are any pending intents with this transaction ID
      const pendingIntents = await this.findPendingIntentsByTransactionId(transaction.txid);
      
      // Update the status of pending intents if the transaction is confirmed
      if (transaction.status?.confirmed && pendingIntents.length > 0) {
        for (const intent of pendingIntents) {
          await this.intentService.updateIntentStatus(intent.id, 'COMPLETED');
          
          // Publish intent update event
          pubsub.publish(`INTENT_UPDATED:${intent.address}`, {
            intentUpdated: {
              ...intent,
              status: 'COMPLETED',
            },
          });
          
          // Publish activity feed update
          const activityItem = await this.intentService.getActivityFeedItem(intent.id);
          if (activityItem) {
            pubsub.publish(`ACTIVITY_FEED_UPDATED:${intent.address}`, {
              activityFeedUpdated: {
                ...activityItem,
                status: 'COMPLETED',
              },
            });
          }
        }
      }
      
      // Process new transaction for potential new intents
      await this.processNewTransaction(savedTransaction);
      
    } catch (error) {
      console.error('Error processing transaction:', error);
      throw error;
    }
  }

  private async findPendingIntentsByTransactionId(txid: string): Promise<any[]> {
    const query = `
      SELECT * FROM wallet_intents.intents
      WHERE status = 'PENDING'
      AND $1 = ANY(transaction_ids)
    `;
    
    return this.db.query(query, [txid]);
  }

  private async processNewTransaction(transaction: any): Promise<void> {
    // This method would analyze the transaction and create new intents if needed
    // For example, detecting BTC transfers, BRC-20 operations, or collectible transfers
    
    // For BTC transfers
    if (transaction.confirmed) {
      // Get all addresses involved in the transaction
      const addresses = new Set<string>();
      
      // Add input addresses
      transaction.inputs.forEach((input: any) => {
        if (input.address) {
          addresses.add(input.address);
        }
      });
      
      // Add output addresses
      transaction.outputs.forEach((output: any) => {
        if (output.address) {
          addresses.add(output.address);
        }
      });
      
      // For each address, check if we need to create a receive intent
      for (const address of addresses) {
        const amount = this.transactionService.determineReceiverAmount(transaction, [address]);
        
        // If the address received BTC, create a receive intent
        if (amount > 0) {
          // Check if an intent already exists for this transaction and address
          const existingIntents = await this.db.query(`
            SELECT * FROM wallet_intents.intents
            WHERE address = $1
            AND $2 = ANY(transaction_ids)
          `, [address, transaction.txid]);
          
          // If no intent exists, create one
          if (existingIntents.length === 0) {
            await this.intentService.createIntent({
              type: 'TRANSACTION',
              status: 'COMPLETED',
              address,
              timestamp: transaction.status.block_time * 1000,
              assetType: 'BTC',
              transactionType: 'RECEIVE',
              transactionIds: [transaction.txid],
              btcAmount: amount,
              amount: amount,
            });
          }
        }
      }
    }
  }
}