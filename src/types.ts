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
  getInscriptionById(inscriptionId: string): Promise<EsploraInscription>;
}

export type EsploraInscription = {
  content_type: string;
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
