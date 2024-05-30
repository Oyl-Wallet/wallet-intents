import {
  IntentHandler,
  IntentStatus,
  IntentType,
  StorageAdapter,
  WalletIntent,
} from "./types";

export class IntentManager implements IntentHandler {
  constructor(
    private storage: StorageAdapter,
    private addresses: string[] = []
  ) {}

  async captureIntent(
    intent: Omit<WalletIntent, "id" | "timestamp">
  ): Promise<void> {
    await this.storage.save(intent as WalletIntent);
  }

  async retrieveAllIntents(): Promise<WalletIntent[]> {
    return this.storage.findAll();
  }

  async retrievePendingIntents(): Promise<WalletIntent[]> {
    const intents = await this.retrieveAllIntents();
    return intents.filter((intent) => intent.status === IntentStatus.Pending);
  }

  async retrieveIntentsByAddresses(
    addresses: string[]
  ): Promise<WalletIntent[]> {
    return this.storage.findByAddresses(addresses);
  }

  async retrieveIntentById(intentId: string): Promise<WalletIntent> {
    return this.storage.findById(intentId);
  }

  async retrieveTransactionIntents(): Promise<WalletIntent[]> {
    const intents = await this.retrieveAllIntents();
    return intents.filter((intent) => intent.type === IntentType.Transaction);
  }

  async getAddresses(): Promise<string[]> {
    return this.addresses;
  }
}
