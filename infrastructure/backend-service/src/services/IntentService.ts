import { Database } from '../db';
import { pubsub } from '../websocket/pubsub';

export interface Intent {
  id: string;
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

export interface ActivityFeedItem {
  id: string;
  type: string;
  status: string;
  address: string;
  timestamp: number;
  assetType: string;
  transactionType: string;
  transactionIds: string[];
  btcAmount: number;
  assetData?: any;
}

export class IntentService {
  constructor(private db: Database) {}

  async getIntentsByAddress(address: string): Promise<Intent[]> {
    const query = `
      SELECT * FROM wallet_intents.intents
      WHERE address = $1
      ORDER BY timestamp DESC
    `;
    
    return this.db.query<Intent>(query, [address]);
  }

  async getIntentById(id: string): Promise<Intent | null> {
    const query = `
      SELECT * FROM wallet_intents.intents
      WHERE id = $1
    `;
    
    return this.db.queryOne<Intent>(query, [id]);
  }

  async createIntent(intent: Omit<Intent, 'id'>): Promise<Intent> {
    const query = `
      INSERT INTO wallet_intents.intents (
        type, status, address, timestamp, asset_type, transaction_type,
        transaction_ids, btc_amount, reason, data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      RETURNING *
    `;
    
    const { type, status, address, timestamp, assetType, transactionType, 
            transactionIds, btcAmount, reason, ...rest } = intent;
    
    const result = await this.db.queryOne<Intent>(query, [
      type,
      status,
      address,
      timestamp,
      assetType,
      transactionType,
      transactionIds,
      btcAmount,
      reason || null,
      rest
    ]);
    
    if (!result) {
      throw new Error('Failed to create intent');
    }
    
    // Publish new intent event
    pubsub.publish(`NEW_INTENT:${address}`, {
      newIntent: result,
    });
    
    // Publish activity feed update
    const activityItem = await this.getActivityFeedItem(result.id);
    if (activityItem) {
      pubsub.publish(`ACTIVITY_FEED_UPDATED:${address}`, {
        activityFeedUpdated: activityItem,
      });
    }
    
    return result;
  }

  async updateIntentStatus(id: string, status: string, reason?: string): Promise<Intent | null> {
    const query = `
      UPDATE wallet_intents.intents
      SET status = $1, reason = $2
      WHERE id = $3
      RETURNING *
    `;
    
    return this.db.queryOne<Intent>(query, [status, reason || null, id]);
  }

  async addTransactionToIntent(id: string, txid: string): Promise<Intent | null> {
    const query = `
      UPDATE wallet_intents.intents
      SET transaction_ids = array_append(transaction_ids, $1)
      WHERE id = $2
      RETURNING *
    `;
    
    return this.db.queryOne<Intent>(query, [txid, id]);
  }

  async getActivityFeed(address: string, limit: number = 20, offset: number = 0): Promise<ActivityFeedItem[]> {
    const query = `
      SELECT * FROM wallet_intents.activity_feed
      WHERE address = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `;
    
    return this.db.query<ActivityFeedItem>(query, [address, limit, offset]);
  }

  async getActivityFeedItem(intentId: string): Promise<ActivityFeedItem | null> {
    const query = `
      SELECT * FROM wallet_intents.activity_feed
      WHERE id = $1
    `;
    
    return this.db.queryOne<ActivityFeedItem>(query, [intentId]);
  }
}