import { db } from '../db';
import { IntentService } from '../services/IntentService';
import { TransactionService } from '../services/TransactionService';
import { pubsub } from '../websocket/pubsub';

// Initialize services
const intentService = new IntentService(db);
const transactionService = new TransactionService(db);

// Define resolver functions
export const resolvers = {
  // Type resolvers
  Intent: {
    __resolveType(intent: any) {
      switch (intent.assetType) {
        case 'btc':
          return 'BTCTransactionIntent';
        case 'brc-20':
          return 'BRC20TransactionIntent';
        case 'rune':
          if (intent.operation === 'etching') return 'RuneEtchingTransactionIntent';
          if (intent.operation === 'mint') return 'RuneMintTransactionIntent';
          if (intent.operation === 'transfer') return 'RuneTransferTransactionIntent';
          return null;
        case 'collectible':
          if (intent.transactionType === 'trade') return 'CollectibleTradeTransactionIntent';
          if (intent.transactionType === 'list') return 'CollectibleListTransactionIntent';
          if (intent.transactionType === 'claim') return 'CollectibleClaimTransactionIntent';
          return 'CollectibleTransactionIntent';
        default:
          return 'TransactionIntent';
      }
    },
  },

  CategorizedInscription: {
    __resolveType(inscription: any) {
      switch (inscription.assetType) {
        case 'brc-20':
          return 'Brc20Asset';
        case 'collectible':
          return 'CollectibleAsset';
        default:
          return null;
      }
    },
  },

  // Query resolvers
  Query: {
    getIntentsByAddress: async (_: any, { address }: { address: string }) => {
      return intentService.getIntentsByAddress(address);
    },

    getIntentById: async (_: any, { id }: { id: string }) => {
      return intentService.getIntentById(id);
    },

    getIntentDetails: async (_: any, { id }: { id: string }) => {
      const intent = await intentService.getIntentById(id);
      if (!intent) return null;

      const transactions = await Promise.all(
        intent.transactionIds.map((txid: string) => 
          transactionService.getTransactionById(txid)
        )
      );

      // Calculate totals
      let totalFee = 0;
      let totalSize = 0;
      let totalVirtualSize = 0;
      let confirmationTime = 0;
      let externalAddress = null;

      transactions.forEach(tx => {
        if (tx) {
          totalFee += tx.fee || 0;
          totalSize += tx.size || 0;
          totalVirtualSize += tx.weight ? tx.weight / 4 : 0;
          
          if (tx.confirmed && tx.blockTime) {
            confirmationTime = tx.blockTime * 1000;
          }
        }
      });

      // Get the last transaction to determine external address
      const lastTx = transactions[transactions.length - 1];
      if (lastTx) {
        externalAddress = intent.transactionType === 'receive'
          ? transactionService.determineSenderAddress(lastTx, [intent.address])
          : transactionService.determineReceiverAddress(lastTx, [intent.address]);
      }

      return {
        intent,
        transactions,
        totalFee,
        totalSize,
        totalVirtualSize,
        confirmationTime,
        externalAddress,
      };
    },

    getActivityFeed: async (_: any, { address, limit = 20, offset = 0 }: { address: string, limit?: number, offset?: number }) => {
      return intentService.getActivityFeed(address, limit, offset);
    },

    getTransactionById: async (_: any, { txid }: { txid: string }) => {
      return transactionService.getTransactionById(txid);
    },
  },

  // Mutation resolvers
  Mutation: {
    updateIntentStatus: async (_: any, { id, status, reason }: { id: string, status: string, reason?: string }) => {
      const updatedIntent = await intentService.updateIntentStatus(id, status, reason);
      
      // Publish intent update event
      if (updatedIntent) {
        pubsub.publish(`INTENT_UPDATED:${updatedIntent.address}`, {
          intentUpdated: updatedIntent,
        });
        
        pubsub.publish(`ACTIVITY_FEED_UPDATED:${updatedIntent.address}`, {
          activityFeedUpdated: await intentService.getActivityFeedItem(updatedIntent.id),
        });
      }
      
      return updatedIntent;
    },

    addTransactionToIntent: async (_: any, { id, txid }: { id: string, txid: string }) => {
      const updatedIntent = await intentService.addTransactionToIntent(id, txid);
      
      // Publish intent update event
      if (updatedIntent) {
        pubsub.publish(`INTENT_UPDATED:${updatedIntent.address}`, {
          intentUpdated: updatedIntent,
        });
      }
      
      return updatedIntent;
    },
  },

  // Subscription resolvers
  Subscription: {
    intentUpdated: {
      subscribe: (_: any, { address }: { address: string }) => {
        return pubsub.asyncIterator([`INTENT_UPDATED:${address}`]);
      },
    },

    newIntent: {
      subscribe: (_: any, { address }: { address: string }) => {
        return pubsub.asyncIterator([`NEW_INTENT:${address}`]);
      },
    },

    activityFeedUpdated: {
      subscribe: (_: any, { address }: { address: string }) => {
        return pubsub.asyncIterator([`ACTIVITY_FEED_UPDATED:${address}`]);
      },
    },
  },
};