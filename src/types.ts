export enum IntentStatus {
  Pending = "pending",
  Completed = "completed",
  Failed = "failed",
}

export enum IntentType {
  Transaction = "transaction",
}

export interface BaseIntent {
  id: string;
  timestamp: number;
  address: string;
  status: IntentStatus;
}

export enum TransactionType {
  Send = "send",
  Receive = "receive",
  Trade = "trade",
}

export enum AssetType {
  BTC = "btc",
  BRC20 = "brc-20",
  RUNE = "rune",
  COLLECTIBLE = "collectible",
}

export interface TransactionIntent extends BaseIntent {
  type: IntentType.Transaction;
  transactionType: TransactionType;
  assetType: AssetType;
  transactionIds: string[];
  btcAmount: number;
}

export interface BTCTransactionIntent extends TransactionIntent {
  assetType: AssetType.BTC;
  amount: number;
}

export interface BRC20TransactionIntent extends TransactionIntent {
  assetType: AssetType.BRC20;
  ticker: string;
  tickerAmount?: number;
  operation: string;
  max?: number;
  limit?: number;
}

export interface RuneTransactionIntent extends TransactionIntent {
  assetType: AssetType.RUNE;
  runeId: string;
  runeName: string;
  runeAmount: number;
}

export interface CollectibleTransactionIntent extends TransactionIntent {
  assetType: AssetType.COLLECTIBLE;
  inscriptionId: string;
  contentType: string;
  content: string;
}

export interface TradeBRC20Intent extends TransactionIntent {
  assetType: AssetType.BRC20;
  transactionType: TransactionType.Trade;
  ticker: string;
}

export type WalletIntent =
  | BTCTransactionIntent
  | BRC20TransactionIntent
  | RuneTransactionIntent
  | CollectibleTransactionIntent
  | TradeBRC20Intent; // Add other intent types here

export interface IntentHandler {
  captureIntent(intent: WalletIntent): Promise<void>;
  retrieveAllIntents(): Promise<WalletIntent[]>;
  retrievePendingIntents(): Promise<WalletIntent[]>;
  retrieveTransactionIntents(): Promise<WalletIntent[]>;
  retrieveIntentsByAddresses(addresses: string[]): Promise<WalletIntent[]>;
}

export interface IntentSynchronizer {
  start(): Promise<void>;
}

export interface StorageAdapter {
  save(intent: WalletIntent): Promise<void>;
  findAll(): Promise<WalletIntent[]>;
  findByType(type: IntentType): Promise<WalletIntent[]>;
  findByStatus(status: IntentStatus): Promise<WalletIntent[]>;
  findByAddresses(addresses: string[]): Promise<WalletIntent[]>;
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

export interface ParsedBRC20 {
  p: string;
  op: string;
  amt: string;
  tick: string;
  max?: string;
  lim?: string;
}

export interface CollectibleAsset extends Inscription {
  assetType: AssetType.COLLECTIBLE;
}

export interface Brc20Asset extends ParsedBRC20 {
  assetType: AssetType.BRC20;
}

export type RuneAsset = {
  assetType: AssetType.RUNE;
};

export type CategorizedAsset = RuneAsset | Brc20Asset | CollectibleAsset;
