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
  ): Promise<WalletIntent> {
    if (this.debug) {
      console.log("Capturing intent", intent);
    } else {
      return this.storage.save(intent as WalletIntent);
    }
  }

  async retrieveAllIntents() {
    return this.storage.findAll();
  }

  async retrievePendingIntentsByAddresses(addresses: string[]) {
    return this.storage.findByStatusAndAddresses(
      IntentStatus.Pending,
      addresses
    );
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
