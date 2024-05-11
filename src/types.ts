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

export interface DataProvider {
  baseUrl: string;
  getTxById(txId: string): Promise<void>;
  getAddressTxs(address: string): Promise<any>;
  getTxOutput(txId: string, index: number): Promise<void>;
  getInscriptionById(
    inscriptionId: string
  ): Promise<EsploraInscriptionResponse>;
}

export type EsploraInscriptionResponse = {
  address: string;
  charms: string[];
  content_type: string;
  fee: number;
  height: number;
  id: string;
  next: string;
  number: number;
  previous: string;
  satpoint: string;
  timestamp: number;
};
