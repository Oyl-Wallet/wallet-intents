import { RunestoneSpec } from "@magiceden-oss/runestone-lib";

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
  List = "list",
  Claim = "claim",
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
  runeName: string;
  inscription?: CategorizedInscription;
}

export interface RuneMintTransactionIntent extends TransactionIntent {
  assetType: AssetType.RUNE;
  operation: RuneOperation.Mint;
  runeId: string;
  runeName: string;
  runeAmount: bigint;
  runeDivisibility: number;
  inscription?: CategorizedInscription;
}

export interface RuneTransferTransactionIntent extends TransactionIntent {
  assetType: AssetType.RUNE;
  operation: RuneOperation.Transfer;
  runeId: string;
  runeName: string;
  runeAmount: bigint;
  runeDivisibility: number;
  inscription?: CategorizedInscription;
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
  receiverAddress?: string;
}

export interface BRC20TradeTransactionIntent extends TransactionIntent {
  assetType: AssetType.BRC20;
  transactionType: TransactionType.Trade;
  ticker: string;
  tickerAmount: number;
  totalPrice: number;
}

export interface RuneTradeTransactionIntent extends TransactionIntent {
  assetType: AssetType.RUNE;
  transactionType: TransactionType.Trade;
  operation: RuneOperation.Transfer;
  runeName: string;
  runeAmount: bigint;
  totalPrice: number;
}

export interface CollectibleTradeTransactionIntent extends TransactionIntent {
  assetType: AssetType.COLLECTIBLE;
  transactionType: TransactionType.Trade;
  inscriptionId: string;
  contentType: string;
  content: string;
  totalPrice: number;
}

export interface CollectibleListTransactionIntent extends TransactionIntent {
  assetType: AssetType.COLLECTIBLE;
  transactionType: TransactionType.List;
  marketplace: string;
  inscriptionId: string;
  collectionName: string;
  inscriptionName: string;
  listingId?: string;
}

export interface CollectibleClaimTransactionIntent extends TransactionIntent {
  assetType: AssetType.COLLECTIBLE;
  transactionType: TransactionType.Claim;
  inscriptionId?: string;
  imageUrl: string;
  collectionName: string;
}

export type WalletIntent =
  | BTCTransactionIntent
  | BRC20TransactionIntent
  | RuneTransactionIntent
  | CollectibleTransactionIntent
  | BRC20TradeTransactionIntent
  | RuneTradeTransactionIntent
  | CollectibleTradeTransactionIntent
  | CollectibleListTransactionIntent
  | CollectibleClaimTransactionIntent;

export type CapturableIntent<T extends WalletIntent> = Omit<
  T,
  "id" | "timestamp"
>;

export type UpdatableBaseIntent = Partial<
  Pick<WalletIntent, "transactionIds" | "status" | "reason">
>;

export type UpdatableListIntent = Partial<
  Pick<CollectibleListTransactionIntent, "listingId" | "status" | "reason">
>;

export type UpdatableIntent = UpdatableBaseIntent | UpdatableListIntent;

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
  deleteAll(): Promise<void>;
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

export type OrdOutputRune = {
  amount: number;
  divisibility: number;
};

export interface OrdOutput {
  address: string;
  indexed: boolean;
  inscriptions: string[];
  runes: Record<string, OrdOutputRune>;
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
  id: string;
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
