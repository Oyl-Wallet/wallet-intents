import { Intent, IntentHandler, IntentStorage } from "./types";

export class IntentManager implements IntentHandler {
  private storage: IntentStorage;

  constructor(storage: IntentStorage) {
    this.storage = storage;
  }

  async captureIntent(intent: Omit<Intent, "id" | "timestamp">): Promise<void> {
    await this.storage.save(intent as Intent);
  }

  async retrieveAllIntents(): Promise<Intent[]> {
    return this.storage.getAllIntents();
  }

  async retrieveIntentsByAddresses(addresses: string[]): Promise<Intent[]> {
    return this.storage.getIntentsByAddresses(addresses);
  }
}
