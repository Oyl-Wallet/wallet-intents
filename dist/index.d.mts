declare enum IntentType {
    Transaction = "transaction"
}
declare enum IntentStatus {
    Pending = "pending",
    Completed = "completed",
    Failed = "failed"
}
declare enum TransactionType {
    Send = "send",
    Receive = "receive",
    Trade = "trade"
}
type TransactionIntent = {
    id: string;
    timestamp: number;
    address: string;
    type: IntentType;
    status: IntentStatus;
    txType: TransactionType;
    txIds: string[];
    amountSats: number;
    brc20s: BRC20Content[];
    collectibles: Inscription[];
    runes: string[];
    traits: string[];
};
type Intent = TransactionIntent;
interface IntentHandler {
    captureIntent(intent: Intent): Promise<void>;
    retrieveAllIntents(): Promise<Intent[]>;
    retrievePendingIntents(): Promise<Intent[]>;
    retrieveTransactionIntents(): Promise<Intent[]>;
    retrieveIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
}
interface StorageAdapter {
    save(intent: Intent): Promise<void>;
    findAll(): Promise<Intent[]>;
    findByType(type: IntentType): Promise<Intent[]>;
    findByStatus(status: IntentStatus): Promise<Intent[]>;
    findByAddresses(addresses: string[]): Promise<Intent[]>;
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
interface BRC20Content {
    p: string;
    op: string;
    amt: string;
    tick: string;
    max?: string;
    lim?: string;
}

declare class InMemoryStorageAdapter implements StorageAdapter {
    private intents;
    save(intent: Intent): Promise<void>;
    findAll(): Promise<Intent[]>;
    findByType(type: IntentType): Promise<Intent[]>;
    findByStatus(status: IntentStatus): Promise<Intent[]>;
    findByAddresses(addresses: string[]): Promise<Intent[]>;
}

declare class PlasmoStorageAdapter implements StorageAdapter {
    private storage;
    private key;
    constructor(key: string);
    save(intent: Intent): Promise<void>;
    findAll(): Promise<Intent[]>;
    findByType(type: IntentType): Promise<Intent[]>;
    findByStatus(status: IntentStatus): Promise<Intent[]>;
    findByAddresses(addresses: string[]): Promise<Intent[]>;
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
    captureIntent(intent: Omit<Intent, "id" | "timestamp">): Promise<void>;
    retrieveAllIntents(): Promise<Intent[]>;
    retrievePendingIntents(): Promise<Intent[]>;
    retrieveIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
    retrieveTransactionIntents(): Promise<Intent[]>;
    getAddresses(): Promise<string[]>;
}

declare class IntentSynchronizer {
    private manager;
    private transactionHandler;
    constructor(manager: IntentManager, provider: RpcProvider);
    syncPendingIntents(): Promise<void>;
    syncReceivedTxIntents(addresses: string[]): Promise<void>;
}

export { type BRC20Content, type EsploraTransaction, InMemoryStorageAdapter, type Inscription, type Intent, type IntentHandler, IntentManager, IntentStatus, IntentSynchronizer, IntentType, type OrdInscription, type OrdOutput, PlasmoStorageAdapter, type RpcProvider, SandshrewRpcProvider, type StorageAdapter, type TransactionIntent, TransactionType };
