import { Database } from '../db';
import { IntentService } from './IntentService';
import { TransactionService } from './TransactionService';

export interface Inscription {
  id: string;
  content_type: string;
  content: string;
  transaction_id: string;
  output_index: number;
}

export class InscriptionProcessor {
  private intentService: IntentService;
  private transactionService: TransactionService;

  constructor(private db: Database) {
    this.intentService = new IntentService(db);
    this.transactionService = new TransactionService(db);
  }

  async processInscription(inscription: Inscription): Promise<void> {
    try {
      // Save the inscription to the database
      await this.saveInscription(inscription);
      
      // Get the transaction that contains this inscription
      const transaction = await this.transactionService.getTransactionById(inscription.transaction_id);
      
      if (!transaction) {
        console.log(`Transaction ${inscription.transaction_id} not found for inscription ${inscription.id}`);
        return;
      }
      
      // Process the inscription based on its content type
      if (inscription.content_type === 'application/json') {
        await this.processJsonInscription(inscription, transaction);
      } else if (inscription.content_type.startsWith('image/')) {
        await this.processImageInscription(inscription, transaction);
      } else {
        await this.processGenericInscription(inscription, transaction);
      }
      
    } catch (error) {
      console.error('Error processing inscription:', error);
      throw error;
    }
  }

  private async saveInscription(inscription: Inscription): Promise<void> {
    const query = `
      INSERT INTO wallet_intents.inscriptions (
        id, content_type, content, transaction_id, output_index
      ) VALUES (
        $1, $2, $3, $4, $5
      )
      ON CONFLICT (id) DO UPDATE SET
        content_type = EXCLUDED.content_type,
        content = EXCLUDED.content,
        transaction_id = EXCLUDED.transaction_id,
        output_index = EXCLUDED.output_index,
        updated_at = NOW()
    `;
    
    await this.db.execute(query, [
      inscription.id,
      inscription.content_type,
      inscription.content,
      inscription.transaction_id,
      inscription.output_index,
    ]);
  }

  private async processJsonInscription(inscription: Inscription, transaction: any): Promise<void> {
    try {
      // Parse the JSON content
      const content = JSON.parse(inscription.content);
      
      // Check if it's a BRC-20 inscription
      if (content.p === 'brc-20') {
        await this.processBrc20Inscription(inscription, content, transaction);
      }
      
    } catch (error) {
      console.error('Error processing JSON inscription:', error);
    }
  }

  private async processBrc20Inscription(inscription: Inscription, content: any, transaction: any): Promise<void> {
    // Get the receiver address
    const outputIndex = inscription.output_index;
    const receiverAddress = transaction.outputs[outputIndex]?.address;
    
    if (!receiverAddress) {
      console.log(`No receiver address found for BRC-20 inscription ${inscription.id}`);
      return;
    }
    
    // Create an intent based on the BRC-20 operation
    const operation = content.op?.toLowerCase();
    
    if (operation === 'deploy') {
      await this.intentService.createIntent({
        type: 'TRANSACTION',
        status: transaction.confirmed ? 'COMPLETED' : 'PENDING',
        address: receiverAddress,
        timestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
        assetType: 'BRC20',
        transactionType: 'RECEIVE',
        transactionIds: [transaction.txid],
        btcAmount: 0,
        ticker: content.tick,
        operation: 'DEPLOY',
        max: content.max ? parseFloat(content.max) : undefined,
        limit: content.lim ? parseFloat(content.lim) : undefined,
      });
    } else if (operation === 'mint') {
      await this.intentService.createIntent({
        type: 'TRANSACTION',
        status: transaction.confirmed ? 'COMPLETED' : 'PENDING',
        address: receiverAddress,
        timestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
        assetType: 'BRC20',
        transactionType: 'RECEIVE',
        transactionIds: [transaction.txid],
        btcAmount: 0,
        ticker: content.tick,
        tickerAmount: content.amt ? parseFloat(content.amt) : undefined,
        operation: 'MINT',
      });
    } else if (operation === 'transfer') {
      await this.intentService.createIntent({
        type: 'TRANSACTION',
        status: transaction.confirmed ? 'COMPLETED' : 'PENDING',
        address: receiverAddress,
        timestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
        assetType: 'BRC20',
        transactionType: 'RECEIVE',
        transactionIds: [transaction.txid],
        btcAmount: 0,
        ticker: content.tick,
        tickerAmount: content.amt ? parseFloat(content.amt) : undefined,
        operation: 'TRANSFER',
      });
    }
  }

  private async processImageInscription(inscription: Inscription, transaction: any): Promise<void> {
    // Get the receiver address
    const outputIndex = inscription.output_index;
    const receiverAddress = transaction.outputs[outputIndex]?.address;
    
    if (!receiverAddress) {
      console.log(`No receiver address found for image inscription ${inscription.id}`);
      return;
    }
    
    // Create a collectible intent
    await this.intentService.createIntent({
      type: 'TRANSACTION',
      status: transaction.confirmed ? 'COMPLETED' : 'PENDING',
      address: receiverAddress,
      timestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
      assetType: 'COLLECTIBLE',
      transactionType: 'RECEIVE',
      transactionIds: [transaction.txid],
      btcAmount: 0,
      inscriptionId: inscription.id,
      contentType: inscription.content_type,
      content: inscription.content,
    });
  }

  private async processGenericInscription(inscription: Inscription, transaction: any): Promise<void> {
    // Get the receiver address
    const outputIndex = inscription.output_index;
    const receiverAddress = transaction.outputs[outputIndex]?.address;
    
    if (!receiverAddress) {
      console.log(`No receiver address found for generic inscription ${inscription.id}`);
      return;
    }
    
    // Create a collectible intent
    await this.intentService.createIntent({
      type: 'TRANSACTION',
      status: transaction.confirmed ? 'COMPLETED' : 'PENDING',
      address: receiverAddress,
      timestamp: transaction.blockTime ? transaction.blockTime * 1000 : Date.now(),
      assetType: 'COLLECTIBLE',
      transactionType: 'RECEIVE',
      transactionIds: [transaction.txid],
      btcAmount: 0,
      inscriptionId: inscription.id,
      contentType: inscription.content_type,
      content: inscription.content,
    });
  }
}