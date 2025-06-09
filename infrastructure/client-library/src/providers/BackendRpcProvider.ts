import {
  RpcProvider,
  EsploraTransaction,
  OrdOutput,
  OrdInscription,
  OrdRune,
  BackendServiceConfig
} from '../types';
import { GraphQLClient } from './GraphQLClient';

export class BackendRpcProvider implements RpcProvider {
  baseUrl: string;
  private client: GraphQLClient;

  constructor(config: BackendServiceConfig) {
    this.baseUrl = config.url;
    this.client = new GraphQLClient(config);
  }

  async getTxById(txId: string): Promise<EsploraTransaction> {
    const query = `
      query GetTransactionById($txid: String!) {
        getTransactionById(txid: $txid) {
          txid
          blockHeight
          blockHash
          blockTime
          confirmed
          fee
          size
          weight
          inputs {
            txid
            vout
            address
            value
          }
          outputs {
            address
            value
            scriptPubKey
          }
        }
      }
    `;

    try {
      const result = await this.client.query<{ getTransactionById: any }>(query, { txid: txId });
      
      if (!result.getTransactionById) {
        throw new Error(`Transaction ${txId} not found`);
      }
      
      // Transform the GraphQL response to match the EsploraTransaction interface
      const tx = result.getTransactionById;
      
      return {
        txid: tx.txid,
        version: 0, // Default value as it's not provided by the backend
        locktime: 0, // Default value as it's not provided by the backend
        vin: tx.inputs.map((input: any) => ({
          txid: input.txid,
          vout: input.vout,
          prevout: {
            scriptpubkey: '',
            scriptpubkey_asm: '',
            scriptpubkey_type: '',
            scriptpubkey_address: input.address || '',
            value: input.value || 0,
          },
          scriptsig: '',
          scriptsig_asm: '',
          witness: [],
          is_coinbase: false,
          sequence: 0,
        })),
        vout: tx.outputs.map((output: any) => ({
          scriptpubkey: output.scriptPubKey || '',
          scriptpubkey_asm: '',
          scriptpubkey_type: '',
          scriptpubkey_address: output.address || '',
          value: output.value || 0,
        })),
        size: tx.size || 0,
        weight: tx.weight || 0,
        fee: tx.fee || 0,
        status: {
          confirmed: tx.confirmed,
          block_height: tx.blockHeight,
          block_hash: tx.blockHash,
          block_time: tx.blockTime,
        },
      };
    } catch (error) {
      console.error(`Error fetching transaction ${txId}:`, error);
      throw error;
    }
  }

  async getAddressTxs(address: string): Promise<EsploraTransaction[]> {
    // This query would need to be implemented on the backend
    // For now, we'll return an empty array
    console.warn('getAddressTxs is not fully implemented in BackendRpcProvider');
    return [];
  }

  async getTxOutput(txId: string, index: number): Promise<OrdOutput> {
    const query = `
      query GetTransactionOutput($txid: String!, $index: Int!) {
        getTransactionOutput(txid: $txid, index: $index) {
          address
          indexed
          inscriptions
          runes
          sat_ranges
          script_pubkey
          spent
          transaction
          value
        }
      }
    `;

    try {
      const result = await this.client.query<{ getTransactionOutput: any }>(query, { 
        txid: txId,
        index
      });
      
      if (!result.getTransactionOutput) {
        throw new Error(`Output ${txId}:${index} not found`);
      }
      
      const output = result.getTransactionOutput;
      
      // Transform runes to the expected format
      const runes: Record<string, { amount: number; divisibility: number }> = {};
      if (output.runes) {
        Object.entries(output.runes).forEach(([key, value]: [string, any]) => {
          runes[key] = {
            amount: value.amount,
            divisibility: value.divisibility,
          };
        });
      }
      
      return {
        address: output.address,
        indexed: output.indexed,
        inscriptions: output.inscriptions || [],
        runes,
        sat_ranges: output.sat_ranges || [],
        script_pubkey: output.script_pubkey,
        spent: output.spent,
        transaction: output.transaction,
        value: output.value,
      };
    } catch (error) {
      console.error(`Error fetching output ${txId}:${index}:`, error);
      throw error;
    }
  }

  async getInscriptionById(inscriptionId: string): Promise<OrdInscription> {
    const query = `
      query GetInscription($id: String!) {
        getInscription(id: $id) {
          id
          content_type
          content
        }
      }
    `;

    try {
      const result = await this.client.query<{ getInscription: any }>(query, { id: inscriptionId });
      
      if (!result.getInscription) {
        throw new Error(`Inscription ${inscriptionId} not found`);
      }
      
      return {
        id: result.getInscription.id,
        content_type: result.getInscription.content_type,
        content: result.getInscription.content,
      };
    } catch (error) {
      console.error(`Error fetching inscription ${inscriptionId}:`, error);
      throw error;
    }
  }

  async getRuneById(runeId: string): Promise<OrdRune> {
    const query = `
      query GetRune($id: String!) {
        getRune(id: $id) {
          id
          entry {
            block
            burned
            divisibility
            etching
            mints
            number
            premine
            spaced_rune
            symbol
            terms {
              amount
              cap
              height
              offset
            }
            timestamp
            turbo
          }
          mintable
          parent
        }
      }
    `;

    try {
      const result = await this.client.query<{ getRune: any }>(query, { id: runeId });
      
      if (!result.getRune) {
        throw new Error(`Rune ${runeId} not found`);
      }
      
      return result.getRune as OrdRune;
    } catch (error) {
      console.error(`Error fetching rune ${runeId}:`, error);
      throw error;
    }
  }
}