import { RunestoneSpec } from '@magiceden-oss/runestone-lib';
import { EventEmitter } from 'events';

declare enum IntentStatus {
    Pending = "pending",
    Completed = "completed",
    Failed = "failed"
}
declare enum IntentType {
    Transaction = "transaction"
}
interface BaseIntent {
    id: string;
    timestamp: number;
    address: string;
    status: IntentStatus;
    reason?: string;
}
declare enum TransactionType {
    Send = "send",
    Receive = "receive",
    Trade = "trade"
}
declare enum AssetType {
    BTC = "btc",
    BRC20 = "brc-20",
    RUNE = "rune",
    COLLECTIBLE = "collectible"
}
declare enum BRC20Operation {
    Deploy = "deploy",
    Mint = "mint",
    Transfer = "transfer"
}
declare enum RuneOperation {
    Etching = "etching",
    Mint = "mint",
    Transfer = "transfer"
}
interface TransactionIntent extends BaseIntent {
    type: IntentType.Transaction;
    transactionType: TransactionType;
    assetType: AssetType;
    transactionIds: string[];
    btcAmount: number;
}
interface BTCTransactionIntent extends TransactionIntent {
    assetType: AssetType.BTC;
    amount: number;
}
interface BRC20TransactionIntent extends TransactionIntent {
    assetType: AssetType.BRC20;
    ticker: string;
    tickerAmount?: number;
    operation: BRC20Operation;
    max?: number;
    limit?: number;
}
interface RuneEtchingTransactionIntent extends TransactionIntent {
    assetType: AssetType.RUNE;
    operation: RuneOperation.Etching;
    runeName: string;
    inscription?: CategorizedInscription;
}
interface RuneMintTransactionIntent extends TransactionIntent {
    assetType: AssetType.RUNE;
    operation: RuneOperation.Mint;
    runeId: string;
    runeName: string;
    runeAmount: bigint;
    runeDivisibility: number;
}
interface RuneTransferTransactionIntent extends TransactionIntent {
    assetType: AssetType.RUNE;
    operation: RuneOperation.Transfer;
    runeId: string;
    runeName: string;
    runeAmount: bigint;
    runeDivisibility: number;
}
type RuneTransactionIntent = RuneEtchingTransactionIntent | RuneMintTransactionIntent | RuneTransferTransactionIntent;
interface CollectibleTransactionIntent extends TransactionIntent {
    assetType: AssetType.COLLECTIBLE;
    inscriptionId: string;
    contentType?: string;
    content?: string;
}
interface BRC20TradeTransactionIntent extends TransactionIntent {
    assetType: AssetType.BRC20;
    transactionType: TransactionType.Trade;
    ticker: string;
    tickerAmount: number;
    totalPrice: number;
}
type WalletIntent = BTCTransactionIntent | BRC20TransactionIntent | RuneTransactionIntent | CollectibleTransactionIntent | BRC20TradeTransactionIntent;
type CapturableIntent<T extends WalletIntent> = Omit<T, "id" | "timestamp">;
type UpdatableIntent = Partial<Pick<WalletIntent, "transactionIds" | "status" | "reason">>;
interface CapturedIntent {
    intent: WalletIntent;
    update: (intent: UpdatableIntent) => Promise<WalletIntent>;
}
type NewIntent = Omit<WalletIntent, "id" | "timestamp">;
type PartialExistingIntent = Partial<Omit<WalletIntent, "id" | "timestamp">> & {
    id: string;
};
interface IntentHandler {
    captureIntent(intent: CapturableIntent<WalletIntent>): Promise<CapturedIntent>;
    retrieveAllIntents(): Promise<WalletIntent[]>;
    retrievePendingIntentsByAddresses(addresses: string[]): Promise<WalletIntent[]>;
    retrieveIntentsByAddresses(addresses: string[]): Promise<WalletIntent[]>;
    retrieveIntentById(intentId: string): Promise<WalletIntent>;
    onIntentCaptured(listener: (intent: WalletIntent) => void): void;
}
interface StorageAdapter {
    save(intent: NewIntent | PartialExistingIntent): Promise<WalletIntent>;
    findAll(): Promise<WalletIntent[]>;
    findByType(type: IntentType): Promise<WalletIntent[]>;
    findByStatusAndAddresses(status: IntentStatus, addresses: string[]): Promise<WalletIntent[]>;
    findByAddresses(addresses: string[]): Promise<WalletIntent[]>;
    findById(intentId: string): Promise<WalletIntent>;
}
interface RpcProvider {
    baseUrl: string;
    getTxById(txId: string): Promise<EsploraTransaction>;
    getAddressTxs(address: string): Promise<EsploraTransaction[]>;
    getTxOutput(txId: string, index: number): Promise<OrdOutput>;
    getInscriptionById(inscriptionId: string): Promise<OrdInscription>;
    getRuneById(runeId: string): Promise<OrdRune>;
}
interface EsploraTransaction {
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
interface OrdOutput {
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
interface OrdRune {
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
type OrdInscription = {
    content_type: string;
    content: string;
};
type Inscription = {
    id: string;
    content_type: string;
    content: string;
};
type Rune = RunestoneSpec;
interface ParsedBRC20 {
    p: string;
    op: string;
    amt: string;
    tick: string;
    max?: string;
    lim?: string;
}
interface CollectibleAsset extends Inscription {
    assetType: AssetType.COLLECTIBLE;
}
interface Brc20Asset extends ParsedBRC20 {
    assetType: AssetType.BRC20;
}
interface RuneAsset extends Rune {
    assetType: AssetType.RUNE;
    inscription?: Inscription | null;
}
type CategorizedInscription = Brc20Asset | CollectibleAsset;

declare class InMemoryStorageAdapter implements StorageAdapter {
    private intents;
    save(intent: NewIntent | PartialExistingIntent): Promise<WalletIntent>;
    findAll(): Promise<WalletIntent[]>;
    findByType(type: IntentType): Promise<WalletIntent[]>;
    findByStatus(status: IntentStatus): Promise<WalletIntent[]>;
    findByAddresses(addresses: string[]): Promise<WalletIntent[]>;
    findByStatusAndAddresses(status: IntentStatus, addresses: string[]): Promise<WalletIntent[]>;
    findById(intentId: string): Promise<WalletIntent>;
}

declare global {
    interface BigInt {
        toJSON(): string;
    }
}
declare class PlasmoStorageAdapter implements StorageAdapter {
    private storage;
    private key;
    constructor(key: string);
    save(intent: NewIntent | PartialExistingIntent): Promise<WalletIntent>;
    findAll(): Promise<WalletIntent[]>;
    findByType(type: IntentType): Promise<WalletIntent[]>;
    findByStatus(status: IntentStatus): Promise<WalletIntent[]>;
    findByAddresses(addresses: string[]): Promise<WalletIntent[]>;
    findByStatusAndAddresses(status: IntentStatus, addresses: string[]): Promise<WalletIntent[]>;
    findById(intentId: string): Promise<WalletIntent>;
}

declare class SandshrewRpcProvider implements RpcProvider {
    baseUrl: string;
    constructor({ network, projectId }: {
        network: string;
        projectId: string;
    });
    getAddressTxs(address: string): Promise<EsploraTransaction[]>;
    getTxById(txId: string): Promise<EsploraTransaction>;
    getTxOutput(txId: string, voutIndex: number): Promise<OrdOutput>;
    getInscriptionById(inscriptionId: string): Promise<OrdInscription>;
    getRuneById(runeId: string): Promise<OrdRune>;
}

declare class IntentManager extends EventEmitter implements IntentHandler {
    private storage;
    debug: boolean;
    constructor(storage: StorageAdapter, debug?: boolean);
    private notifyIntentCaptured;
    captureIntent(intent: CapturableIntent<WalletIntent>): Promise<CapturedIntent>;
    retrieveAllIntents(): Promise<WalletIntent[]>;
    retrievePendingIntentsByAddresses(addresses: string[]): Promise<WalletIntent[]>;
    retrieveIntentsByAddresses(addresses: string[]): Promise<WalletIntent[]>;
    retrieveIntentById(intentId: string): Promise<WalletIntent>;
    onIntentCaptured(listener: (intent: WalletIntent) => void): void;
}

declare class IntentSynchronizer {
    private manager;
    private transactionHandler;
    constructor(manager: IntentManager, provider: RpcProvider);
    syncPendingIntents(addresses: string[]): Promise<void>;
    syncIntentsFromChain(addresses: string[]): Promise<void>;
}

export { AssetType, BRC20Operation, type BRC20TradeTransactionIntent, type BRC20TransactionIntent, type BTCTransactionIntent, type BaseIntent, type Brc20Asset, type CapturableIntent, type CapturedIntent, type CategorizedInscription, type CollectibleAsset, type CollectibleTransactionIntent, type EsploraTransaction, InMemoryStorageAdapter, type Inscription, type IntentHandler, IntentManager, IntentStatus, IntentSynchronizer, IntentType, type NewIntent, type OrdInscription, type OrdOutput, type OrdRune, type ParsedBRC20, type PartialExistingIntent, PlasmoStorageAdapter, type RpcProvider, type Rune, type RuneAsset, type RuneEtchingTransactionIntent, type RuneMintTransactionIntent, RuneOperation, type RuneTransactionIntent, type RuneTransferTransactionIntent, SandshrewRpcProvider, type StorageAdapter, type TransactionIntent, TransactionType, type UpdatableIntent, type WalletIntent };
