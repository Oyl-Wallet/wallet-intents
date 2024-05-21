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
interface StorageAdapter {
    save(intent: Intent): Promise<void>;
    getAllIntents(): Promise<Intent[]>;
    getIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
}
interface DataProvider {
    baseUrl: string;
    getTxById(txId: string): Promise<void>;
    getAddressTxs(address: string): Promise<any>;
    getTxOutput(txId: string, index: number): Promise<void>;
    getInscriptionById(inscriptionId: string): Promise<EsploraInscription>;
}
type EsploraInscription = {
    content_type: string;
};

declare class InMemoryStorageAdapter implements StorageAdapter {
    private intents;
    save(intent: Intent): Promise<void>;
    getAllIntents(): Promise<Intent[]>;
    getIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
}

declare class SandshrewRpcProvider implements DataProvider {
    baseUrl: string;
    constructor({ network, projectId }: {
        network: string;
        projectId: string;
    });
    getAddressTxs(address: string): Promise<any>;
    getTxById(txId: string): Promise<any>;
    getTxOutput(txId: string, voutIndex: number): Promise<any>;
    getInscriptionById(inscriptionId: string): Promise<any>;
}

declare class IntentManager implements IntentHandler {
    private storage;
    constructor(storage: StorageAdapter);
    captureIntent(intent: Omit<Intent, "id" | "timestamp">): Promise<void>;
    retrieveAllIntents(): Promise<Intent[]>;
    retrieveIntentsByAddresses(addresses: string[]): Promise<Intent[]>;
}

declare class IntentSynchronizer {
    private provider;
    private manager;
    constructor(manager: IntentManager, provider: DataProvider);
    syncIntents(): Promise<void>;
    syncReceivedTxIntents(addresses: string[]): Promise<void>;
    private syncTxIntent;
}

export { InMemoryStorageAdapter, IntentManager, IntentSynchronizer, SandshrewRpcProvider };
