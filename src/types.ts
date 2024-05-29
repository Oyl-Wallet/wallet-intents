export enum IntentType {
  Transaction = "transaction",
}

export enum IntentStatus {
  Pending = "pending",
  Completed = "completed",
  Failed = "failed",
}

export type Intent = {
  id: string;
  timestamp: number;
  address: string;
  type: IntentType;
  status: IntentStatus;
  data: Record<string, any>;
};

export interface IntentHandler {
  captureIntent(intent: Intent): Promise<void>;
  retrieveAllIntents(): Promise<Intent[]>;
  retrieveIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
}

export interface IntentSynchronizer {
  start(): Promise<void>;
}

export interface StorageAdapter {
  save(intent: Intent): Promise<void>;
  getAllIntents(): Promise<Intent[]>;
  getIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
}

export interface RpcProvider {
  baseUrl: string;
  getTxById(txId: string): Promise<EsploraTransaction>;
  getAddressTxs(address: string): Promise<EsploraTransaction[]>;
  getTxOutput(txId: string, index: number): Promise<OrdOutput>;
  getInscriptionById(inscriptionId: string): Promise<OrdInscription>;
}

export interface EsploraTransaction {
  txid: string;
  version: number;
  locktime: number;
  vin: {
    txid: string;
    vout: number;
    prevout: {
      scriptpubkey: string;
      scriptpubkey_asm: string;
      scriptpubkey_type: string;
      scriptpubkey_address: string;
      value: number;
    };
    scriptsig: string;
    scriptsig_asm: string;
    witness: string[];
    is_coinbase: boolean;
    sequence: number;
  }[];
  vout: {
    scriptpubkey: string;
    scriptpubkey_asm: string;
    scriptpubkey_type: string;
    scriptpubkey_address: string;
    value: number;
  }[];
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface OrdOutput {
  address: string;
  indexed: boolean;
  inscriptions: string[];
  runes: any[];
  sat_ranges: number[][];
  script_pubkey: string;
  spent: boolean;
  transaction: string;
  value: number;
}

export type OrdInscription = {
  content_type: string;
  content: string;
};

export type Inscription = {
  id: string;
  content_type: string;
  content: string;
};

export interface BRC20Content {
  p: string;
  op: string;
  amt: string;
  tick: string;
  max?: string;
  lim?: string;
}
