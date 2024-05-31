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
    private debug: boolean = false
  ) {}

  async captureIntent(
    intent: Omit<WalletIntent, "id" | "timestamp">
  ): Promise<void> {
    if (this.debug) {
      console.log("Capturing intent", intent);
    } else {
      return this.storage.save(intent as WalletIntent);
    }
  }

  async retrieveAllIntents() {
    return this.storage.findAll();
  }

  async retrievePendingIntents() {
    return this.storage.findByStatus(IntentStatus.Pending);
  }

  async retrieveIntentsByAddresses(addresses: string[]) {
    return this.storage.findByAddresses(addresses);
  }

  async retrieveIntentById(intentId: string) {
    return this.storage.findById(intentId);
  }

  async retrieveTransactionIntents() {
    return this.storage.findByType(IntentType.Transaction);
  }
}
