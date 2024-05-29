declare enum IntentType {
    Transaction = "transaction"
}
declare enum IntentStatus {
    Pending = "pending",
    Completed = "completed",
    Failed = "failed"
}
type Intent = {
    id: string;
    timestamp: number;
    address: string;
    type: IntentType;
    status: IntentStatus;
    data: Record<string, any>;
};
interface IntentHandler {
    captureIntent(intent: Intent): Promise<void>;
    retrieveAllIntents(): Promise<Intent[]>;
    retrieveIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
}
interface IntentStorage {
    save(intent: Intent): Promise<void>;
    getAllIntents(): Promise<Intent[]>;
    getIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
}
interface IntentProvider {
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

declare class InMemoryStorage implements IntentStorage {
    private intents;
    save(intent: Intent): Promise<void>;
    getAllIntents(): Promise<Intent[]>;
    getIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
}

declare class PlasmoStorage implements IntentStorage {
    private storage;
    private key;
    constructor(key: string);
    save(intent: Intent): Promise<void>;
    getAllIntents(): Promise<Intent[]>;
    getIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
    purgeIntentsByAddresses(addresses: string[]): Promise<void>;
}

declare class SandshrewRpcProvider implements IntentProvider {
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
    constructor(storage: IntentStorage, addresses?: string[]);
    captureIntent(intent: Omit<Intent, "id" | "timestamp">): Promise<void>;
    retrieveAllIntents(): Promise<Intent[]>;
    retrievePendingIntents(): Promise<Intent[]>;
    retrieveIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
    getAddresses(): Promise<string[]>;
}

declare class IntentSynchronizer {
    private manager;
    private transactionHandler;
    constructor(manager: IntentManager, provider: IntentProvider);
    syncPendingIntents(): Promise<void>;
    syncReceivedTxIntents(addresses: string[]): Promise<void>;
}

export { InMemoryStorage, IntentManager, IntentSynchronizer, PlasmoStorage, SandshrewRpcProvider };
