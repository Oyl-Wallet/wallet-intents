import {
  CapturedIntent,
  IntentHandler,
  IntentStatus,
  CapturableIntent,
  StorageAdapter,
  WalletIntent,
} from "./types";

export class IntentManager implements IntentHandler {
  constructor(private storage: StorageAdapter) {}

  async captureIntent(intent: CapturableIntent): Promise<CapturedIntent> {
    const capturedIntent = await this.storage.save(intent);

    const update = async (
      updates: Partial<WalletIntent>
    ): Promise<WalletIntent> => {
      return this.storage.save({ ...capturedIntent, ...updates });
    };

    return {
      intent: capturedIntent,
      update,
    };
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
}
