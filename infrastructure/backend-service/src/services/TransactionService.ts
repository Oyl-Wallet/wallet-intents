import { Database } from '../db';

export interface Transaction {
  txid: string;
  blockHeight?: number;
  blockHash?: string;
  blockTime?: number;
  confirmed: boolean;
  fee?: number;
  size?: number;
  weight?: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
}

export interface TransactionInput {
  txid: string;
  vout: number;
  address?: string;
  value?: number;
}

export interface TransactionOutput {
  address?: string;
  value?: number;
  scriptPubKey: string;
}

export class TransactionService {
  constructor(private db: Database) {}

  async getTransactionById(txid: string): Promise<Transaction | null> {
    const query = `
      SELECT * FROM wallet_intents.transactions
      WHERE txid = $1
    `;
    
    const transaction = await this.db.queryOne<any>(query, [txid]);
    
    if (!transaction) {
      return null;
    }
    
    // Get inputs and outputs from the data field
    const inputs = transaction.data?.vin || [];
    const outputs = transaction.data?.vout || [];
    
    return {
      txid: transaction.txid,
      blockHeight: transaction.block_height,
      blockHash: transaction.block_hash,
      blockTime: transaction.block_time,
      confirmed: transaction.confirmed,
      fee: transaction.fee,
      size: transaction.size,
      weight: transaction.weight,
      inputs: inputs.map((input: any) => ({
        txid: input.txid,
        vout: input.vout,
        address: input.prevout?.scriptpubkey_address,
        value: input.prevout?.value,
      })),
      outputs: outputs.map((output: any) => ({
        address: output.scriptpubkey_address,
        value: output.value,
        scriptPubKey: output.scriptpubkey,
      })),
    };
  }

  async saveTransaction(transaction: any): Promise<Transaction> {
    const query = `
      INSERT INTO wallet_intents.transactions (
        txid, block_height, block_hash, block_time, confirmed, fee, size, weight, data
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      )
      ON CONFLICT (txid) DO UPDATE SET
        block_height = EXCLUDED.block_height,
        block_hash = EXCLUDED.block_hash,
        block_time = EXCLUDED.block_time,
        confirmed = EXCLUDED.confirmed,
        fee = EXCLUDED.fee,
        size = EXCLUDED.size,
        weight = EXCLUDED.weight,
        data = EXCLUDED.data,
        updated_at = NOW()
      RETURNING *
    `;
    
    const result = await this.db.queryOne<any>(query, [
      transaction.txid,
      transaction.status?.block_height || null,
      transaction.status?.block_hash || null,
      transaction.status?.block_time || null,
      transaction.status?.confirmed || false,
      transaction.fee,
      transaction.size,
      transaction.weight,
      transaction,
    ]);
    
    if (!result) {
      throw new Error('Failed to save transaction');
    }
    
    return this.getTransactionById(transaction.txid) as Promise<Transaction>;
  }

  // Helper method to determine the sender address from a transaction
  determineSenderAddress(transaction: Transaction, excludeAddresses: string[]): string | null {
    // Check inputs for addresses not in the exclude list
    for (const input of transaction.inputs) {
      if (input.address && !excludeAddresses.includes(input.address)) {
        return input.address;
      }
    }
    
    return null;
  }

  // Helper method to determine the receiver address from a transaction
  determineReceiverAddress(transaction: Transaction, excludeAddresses: string[]): string | null {
    // Check outputs for addresses not in the exclude list
    for (const output of transaction.outputs) {
      if (output.address && !excludeAddresses.includes(output.address)) {
        return output.address;
      }
    }
    
    return null;
  }

  // Helper method to determine the amount received by an address
  determineReceiverAmount(transaction: Transaction, addresses: string[]): number {
    let amount = 0;
    
    // Sum up the values of outputs going to the specified addresses
    for (const output of transaction.outputs) {
      if (output.address && addresses.includes(output.address) && output.value) {
        amount += output.value;
      }
    }
    
    return amount;
  }
}