import { RuneEtchingSpec, RunestoneSpec } from "@magiceden-oss/runestone-lib";

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
  reason?: string;
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

export enum BRC20Operation {
  Deploy = "deploy",
  Mint = "mint",
  Transfer = "transfer",
}

export enum RuneOperation {
  Etching = "etching",
  Mint = "mint",
  Transfer = "transfer",
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
  operation: BRC20Operation;
  max?: number;
  limit?: number;
}

export interface RuneEtchingTransactionIntent extends TransactionIntent {
  assetType: AssetType.RUNE;
  operation: RuneOperation.Etching;
  etching: RuneEtchingSpec;
  inscription?: CategorizedInscription;
}

export interface RuneMintTransactionIntent extends TransactionIntent {
  assetType: AssetType.RUNE;
  operation: RuneOperation.Mint;
  runeId: string;
  runeName: string;
  runeAmount: number;
}

export interface RuneTransferTransactionIntent extends TransactionIntent {
  assetType: AssetType.RUNE;
  operation: RuneOperation.Transfer;
}

export type RuneTransactionIntent =
  | RuneEtchingTransactionIntent
  | RuneMintTransactionIntent
  | RuneTransferTransactionIntent;

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
  tickerAmount: number;
}

export type WalletIntent =
  | BTCTransactionIntent
  | BRC20TransactionIntent
  | RuneTransactionIntent
  | CollectibleTransactionIntent
  | TradeBRC20Intent; // Add other intent types here

export type CapturableIntent<T extends WalletIntent> = Omit<
  T,
  "id" | "timestamp"
>;

export type UpdatableIntent = Partial<
  Pick<WalletIntent, "transactionIds" | "status" | "reason">
>;

export interface CapturedIntent {
  intent: WalletIntent;
  update: (intent: UpdatableIntent) => Promise<WalletIntent>;
}

export type NewIntent = Omit<WalletIntent, "id" | "timestamp">;
export type PartialExistingIntent = Partial<
  Omit<WalletIntent, "id" | "timestamp">
> & { id: string };

export interface IntentHandler {
  captureIntent(
    intent: CapturableIntent<WalletIntent>
  ): Promise<CapturedIntent>;
  retrieveAllIntents(): Promise<WalletIntent[]>;
  retrievePendingIntentsByAddresses(
    addresses: string[]
  ): Promise<WalletIntent[]>;
  retrieveIntentsByAddresses(addresses: string[]): Promise<WalletIntent[]>;
  retrieveIntentById(intentId: string): Promise<WalletIntent>;
  onIntentCaptured(listener: (intent: WalletIntent) => void): void;
}

export interface IntentSynchronizer {
  start(): Promise<void>;
}

export interface StorageAdapter {
  save(intent: NewIntent | PartialExistingIntent): Promise<WalletIntent>;
  findAll(): Promise<WalletIntent[]>;
  findByType(type: IntentType): Promise<WalletIntent[]>;
  findByStatusAndAddresses(
    status: IntentStatus,
    addresses: string[]
  ): Promise<WalletIntent[]>;
  findByAddresses(addresses: string[]): Promise<WalletIntent[]>;
  findById(intentId: string): Promise<WalletIntent>;
}

export interface RpcProvider {
  baseUrl: string;
  getTxById(txId: string): Promise<EsploraTransaction>;
  getAddressTxs(address: string): Promise<EsploraTransaction[]>;
  getTxOutput(txId: string, index: number): Promise<OrdOutput>;
  getInscriptionById(inscriptionId: string): Promise<OrdInscription>;
  getRuneById(runeId: string): Promise<OrdRune>;
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
    scriptpubkey_address?: string;
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

export interface OrdRune {
  entry: {
    block: number;
    burned: number;
    divisibility: number;
    etching: string;
    mints: number;
    number: number;
    premine: number;
    spaced_rune: string;
    symbol: string;
    terms: {
      amount: number;
      cap: number;
      height: any[];
      offset: any[];
    };
    timestamp: number;
    turbo: boolean;
  };
  id: string;
  mintable: boolean;
  parent: string;
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

export type Rune = RunestoneSpec;

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

export interface RuneAsset extends Rune {
  assetType: AssetType.RUNE;
  inscription?: Inscription | null;
}

export type CategorizedInscription = Brc20Asset | CollectibleAsset;
