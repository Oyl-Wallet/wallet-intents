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
interface TransactionIntent extends BaseIntent {
    type: IntentType.Transaction;
    transactionType: TransactionType;
    assetType: AssetType;
    transactionIds: string[];
    amount: number;
}
interface BTCTransactionIntent extends TransactionIntent {
    assetType: AssetType.BTC;
    amount: number;
}
interface BRC20TransactionIntent extends TransactionIntent {
    assetType: AssetType.BRC20;
    ticker: string;
    operation: string;
    max?: number;
    limit?: number;
}
interface RuneTransactionIntent extends TransactionIntent {
    assetType: AssetType.RUNE;
    runeId: string;
    runeName: string;
}
interface CollectibleTransactionIntent extends TransactionIntent {
    assetType: AssetType.COLLECTIBLE;
    inscriptionId: string;
    contentType: string;
    content: string;
}
interface TradeBRC20Intent extends TransactionIntent {
    assetType: AssetType.BRC20;
    transactionType: TransactionType.Trade;
    ticker: string;
}
type WalletIntent = BTCTransactionIntent | BRC20TransactionIntent | RuneTransactionIntent | CollectibleTransactionIntent | TradeBRC20Intent;
interface IntentHandler {
    captureIntent(intent: WalletIntent): Promise<void>;
    retrieveAllIntents(): Promise<WalletIntent[]>;
    retrievePendingIntents(): Promise<WalletIntent[]>;
    retrieveTransactionIntents(): Promise<WalletIntent[]>;
    retrieveIntentsByAddresses(addresses: string[]): Promise<WalletIntent[]>;
}
interface StorageAdapter {
    save(intent: WalletIntent): Promise<void>;
    findAll(): Promise<WalletIntent[]>;
    findByType(type: IntentType): Promise<WalletIntent[]>;
    findByStatus(status: IntentStatus): Promise<WalletIntent[]>;
    findByAddresses(addresses: string[]): Promise<WalletIntent[]>;
}
interface RpcProvider {
    baseUrl: string;
    getTxById(txId: string): Promise<EsploraTransaction>;
    getAddressTxs(address: string): Promise<EsploraTransaction[]>;
    getTxOutput(txId: string, index: number): Promise<OrdOutput>;
    getInscriptionById(inscriptionId: string): Promise<OrdInscription>;
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
type OrdInscription = {
    content_type: string;
    content: string;
};
type Inscription = {
    id: string;
    content_type: string;
    content: string;
};
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
type RuneAsset = {
    assetType: AssetType.RUNE;
};
type CategorizedAsset = RuneAsset | Brc20Asset | CollectibleAsset;

declare class InMemoryStorageAdapter implements StorageAdapter {
    private intents;
    save(intent: WalletIntent): Promise<void>;
    findAll(): Promise<WalletIntent[]>;
    findByType(type: IntentType): Promise<WalletIntent[]>;
    findByStatus(status: IntentStatus): Promise<WalletIntent[]>;
    findByAddresses(addresses: string[]): Promise<WalletIntent[]>;
}

declare class PlasmoStorageAdapter implements StorageAdapter {
    private storage;
    private key;
    constructor(key: string);
    save(intent: WalletIntent): Promise<void>;
    findAll(): Promise<WalletIntent[]>;
    findByType(type: IntentType): Promise<WalletIntent[]>;
    findByStatus(status: IntentStatus): Promise<WalletIntent[]>;
    findByAddresses(addresses: string[]): Promise<WalletIntent[]>;
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
}

declare class IntentManager implements IntentHandler {
    private storage;
    private addresses;
    constructor(storage: StorageAdapter, addresses?: string[]);
    captureIntent(intent: Omit<WalletIntent, "id" | "timestamp">): Promise<void>;
    retrieveAllIntents(): Promise<WalletIntent[]>;
    retrievePendingIntents(): Promise<WalletIntent[]>;
    retrieveIntentsByAddresses(addresses: string[]): Promise<WalletIntent[]>;
    retrieveTransactionIntents(): Promise<WalletIntent[]>;
    getAddresses(): Promise<string[]>;
}

declare class IntentSynchronizer {
    private manager;
    private transactionHandler;
    constructor(manager: IntentManager, provider: RpcProvider);
    syncPendingIntents(): Promise<void>;
    syncReceivedTxIntents(addresses: string[]): Promise<void>;
}

export { AssetType, type BRC20TransactionIntent, type BTCTransactionIntent, type BaseIntent, type Brc20Asset, type CategorizedAsset, type CollectibleAsset, type CollectibleTransactionIntent, type EsploraTransaction, InMemoryStorageAdapter, type Inscription, type IntentHandler, IntentManager, IntentStatus, IntentSynchronizer, IntentType, type OrdInscription, type OrdOutput, type ParsedBRC20, PlasmoStorageAdapter, type RpcProvider, type RuneAsset, type RuneTransactionIntent, SandshrewRpcProvider, type StorageAdapter, type TradeBRC20Intent, type TransactionIntent, TransactionType, type WalletIntent };
