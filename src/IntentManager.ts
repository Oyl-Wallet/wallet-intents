import { Intent, IntentHandler, IntentStatus, StorageAdapter } from "./types";

export class IntentManager implements IntentHandler {
  constructor(
    private storage: StorageAdapter,
    private addresses: string[] = []
  ) {}

  async captureIntent(intent: Omit<Intent, "id" | "timestamp">): Promise<void> {
    await this.storage.save(intent as Intent);
  }

  async retrieveAllIntents(): Promise<Intent[]> {
    return this.storage.getAllIntents();
  }

  async retrievePendingIntents(): Promise<Intent[]> {
    const intents = await this.retrieveAllIntents();
    return intents.filter((intent) => intent.status === IntentStatus.Pending);
  }

  async retrieveIntentsByAddresses(addresses: string[]): Promise<Intent[]> {
    return this.storage.getIntentsByAddresses(addresses);
  }

  async getAddresses(): Promise<string[]> {
    return this.addresses;
  }
}
