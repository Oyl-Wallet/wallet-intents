import { Database } from '../db';
import { IntentService } from './IntentService';
import { TransactionService } from './TransactionService';
import { InscriptionProcessor } from './InscriptionProcessor';

export interface Rune {
  id: string;
  name: string;
  symbol?: string;
  divisibility: number;
  etching_txid: string;
  block_height: number;
  premine?: string;
  cap?: string;
  data: any;
}

export interface RuneOperation {
  type: 'etching' | 'mint' | 'transfer';
  runeId: string;
  amount?: string;
  from?: string;
  to?: string;
  transaction_id: string;
}

export class RuneProcessor {
  private intentService: IntentService;
  private transactionService: TransactionService;
  private inscriptionProcessor: InscriptionProcessor;

  constructor(private db: Database) {
    this.intentService = new IntentService(db);
    this.transactionService = new TransactionService(db);
    this.inscriptionProcessor = new InscriptionProcessor(db);
  }

  async processRune(rune: Rune): Promise<void> {
    try {
      // Save the rune to the database
      await this.saveRune(rune);
      
      // Process rune operations
      await this.processRuneOperations(rune);
      
    } catch (error) {
      console.error('Error processing rune:', error);
      throw error;
    }
  }

  async processRuneOperation(operation: RuneOperation): Promise<void> {
    try {
      // Get the transaction
      const transaction = await this.transactionService.getTransactionById(operation.transaction_id);
      
      if (!transaction) {
        console.log(`Transaction ${operation.transaction_id} not found for rune operation`);
        return;
      }
      
      // Get the rune
      const rune = await this.getRuneById(operation.runeId);
      
      if (!rune) {
        console.log(`Rune ${operation.runeId} not found`);
        return;
      }
      
      // Process based on operation type
      switch (operation.type) {
        case 'etching':
          await this.processEtching(rune, transaction);
          break;
        case 'mint':
          await this.processMint(rune, operation, transaction);
          break;
        case 'transfer':
          await this.processTransfer(rune, operation, transaction);
          break;
      }
      
    } catch (error) {
      console.error('Error processing rune operation:', error);
      throw error;
    }
  }

  private async saveRune(rune: Rune): Promise<void> {
    const query = `
      INSERT INTO wallet_intents.runes (
        id, name, symbol, divisibility, etching_txid, block_height, premine, cap, data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        symbol = EXCLUDED.symbol,
        divisibility = EXCLUDED.divisibility,
        etching_txid = EXCLUDED.etching_txid,
        block_height = EXCLUDED.block_height,
        premine = EXCLUDED.premine,
        cap = EXCLUDED.cap,
        data = EXCLUDED.data,
        updated_at = NOW()
    `;
    
    await this.db.execute(query, [
      rune.id,
      rune.name,
      rune.symbol || null,
      rune.divisibility,
      rune.etching_txid,
      rune.block_height,
      rune.premine || null,
      rune.cap || null,
      rune.data,
    ]);
  }

  private async getRuneById(runeId: string): Promise<Rune | null> {
    const query = `
      SELECT * FROM wallet_intents.runes
      WHERE id = $1
    `;
    
    return this.db.queryOne<Rune>(query, [runeId]);
  }

  private async processRuneOperations(rune: Rune): Promise<void> {
    // Get the etching transaction
    const etchingTx = await this.transactionService.getTransactionById(rune.etching_txid);
    
    if (!etchingTx) {
      console.log(`Etching transaction ${rune.etching_txid} not found for rune ${rune.id}`);
      return;
    }
    
    // Process the etching
    await this.processEtching(rune, etchingTx);
    
    // Get all transactions involving this rune
    const query = `
      SELECT t.*
      FROM wallet_intents.transactions t
      JOIN jsonb_array_elements(t.data->'vout') AS vout ON true
      WHERE vout->'runes'->$1 IS NOT NULL
    `;
    
    const transactions = await this.db.query<any>(query, [rune.id]);
    
    // Process each transaction
    for (const tx of transactions) {
      const transaction = await this.transactionService.getTransactionById(tx.txid);
      
      if (!transaction) continue;
      
      // Check if it's a mint or transfer
      const vouts = tx.data.vout || [];
      
      for (let i = 0; i < vouts.length; i++) {
        const vout = vouts[i];
        const runeData = vout.runes?.[rune.id];
        
        if (runeData) {
          const amount = runeData.amount;
          const receiverAddress = vout.scriptpubkey_address;
          
          if (!receiverAddress) continue;
          
          // Determine if it's a mint or transfer
          const isMint = tx.txid === rune.etching_txid || runeData.mint;
          
          if (isMint) {
            await this.processMint(
              rune,
              {
                type: 'mint',
                runeId: rune.id,
                amount: amount.toString(),
                to: receiverAddress,
                transaction_id: tx.txid,
              },
              transaction
            );
          } else {
            // Find the sender address
            const senderAddress = this.transactionService.determineSenderAddress(transaction, [receiverAddress]);
            
            await this.processTransfer(
              rune,
              {
                type: 'transfer',
                runeId: rune.id,
                amount: amount.toString(),
                from: senderAddress || undefined,
                to: receiverAddress,
                transaction_id: tx.txid,
              },
              transaction
            );
          }
        }
      }
    }
  }

  private async processEtching(rune: Rune, transaction: any): Promise<void> {
    // Find the creator address (first input address)
    const creatorAddress = transaction.inputs[0]?.address;
    
    if (!creatorAddress) {
      console.log(`No creator address found for rune etching ${rune.id}`);
      return;
    }
    
    // Check if an etching intent already exists
    const existingIntents = await this.db.query(`
      SELECT * FROM wallet_intents.intents
      WHERE address = $1
      AND asset_type = 'RUNE'
      AND data->>'operation' = 'ETCHING'
      AND data->>'runeName' = $2
    `, [creatorAddress, rune.name]);
    
    if (existingIntents.length > 0) {
      return;
    }
    
    // Create an etching intent
    await this.intentService.createIntent({
      type: 'TRANSACTION',
      status: transaction.confirmed ? 'COMPLETED' : 'PENDING',
      address: creatorAddress,
      timestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
      assetType: 'RUNE',
      transactionType: 'RECEIVE',
      transactionIds: [transaction.txid],
      btcAmount: 0,
      operation: 'ETCHING',
      runeName: rune.name,
    });
  }

  private async processMint(rune: Rune, operation: RuneOperation, transaction: any): Promise<void> {
    if (!operation.to) {
      console.log(`No receiver address found for rune mint ${rune.id}`);
      return;
    }
    
    // Check if a mint intent already exists
    const existingIntents = await this.db.query(`
      SELECT * FROM wallet_intents.intents
      WHERE address = $1
      AND asset_type = 'RUNE'
      AND data->>'operation' = 'MINT'
      AND data->>'runeId' = $2
      AND $3 = ANY(transaction_ids)
    `, [operation.to, rune.id, transaction.txid]);
    
    if (existingIntents.length > 0) {
      return;
    }
    
    // Create a mint intent
    await this.intentService.createIntent({
      type: 'TRANSACTION',
      status: transaction.confirmed ? 'COMPLETED' : 'PENDING',
      address: operation.to,
      timestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
      assetType: 'RUNE',
      transactionType: 'RECEIVE',
      transactionIds: [transaction.txid],
      btcAmount: 0,
      operation: 'MINT',
      runeId: rune.id,
      runeName: rune.name,
      runeAmount: operation.amount || '0',
      runeDivisibility: rune.divisibility,
    });
  }

  private async processTransfer(rune: Rune, operation: RuneOperation, transaction: any): Promise<void> {
    if (!operation.to) {
      console.log(`No receiver address found for rune transfer ${rune.id}`);
      return;
    }
    
    // Check if a transfer intent already exists
    const existingIntents = await this.db.query(`
      SELECT * FROM wallet_intents.intents
      WHERE address = $1
      AND asset_type = 'RUNE'
      AND data->>'operation' = 'TRANSFER'
      AND data->>'runeId' = $2
      AND $3 = ANY(transaction_ids)
    `, [operation.to, rune.id, transaction.txid]);
    
    if (existingIntents.length > 0) {
      return;
    }
    
    // Create a transfer intent
    await this.intentService.createIntent({
      type: 'TRANSACTION',
      status: transaction.confirmed ? 'COMPLETED' : 'PENDING',
      address: operation.to,
      timestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
      assetType: 'RUNE',
      transactionType: 'RECEIVE',
      transactionIds: [transaction.txid],
      btcAmount: 0,
      operation: 'TRANSFER',
      runeId: rune.id,
      runeName: rune.name,
      runeAmount: operation.amount || '0',
      runeDivisibility: rune.divisibility,
    });
    
    // If we know the sender, create a send intent
    if (operation.from) {
      await this.intentService.createIntent({
        type: 'TRANSACTION',
        status: transaction.confirmed ? 'COMPLETED' : 'PENDING',
        address: operation.from,
        timestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
        assetType: 'RUNE',
        transactionType: 'SEND',
        transactionIds: [transaction.txid],
        btcAmount: 0,
        operation: 'TRANSFER',
        runeId: rune.id,
        runeName: rune.name,
        runeAmount: operation.amount || '0',
        runeDivisibility: rune.divisibility,
      });
    }
  }
}