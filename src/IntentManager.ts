import { EventEmitter } from "events";
import {
  CapturedIntent,
  IntentHandler,
  IntentStatus,
  CapturableIntent,
  StorageAdapter,
  WalletIntent,
} from "./types";

export class IntentManager extends EventEmitter implements IntentHandler {
  constructor(private storage: StorageAdapter, public debug = false) {
    super();
  }

  private notifyIntentCaptured(intent: CapturableIntent<WalletIntent>) {
    this.emit("intentCaptured", intent);
  }

  async captureIntent(
    intent: CapturableIntent<WalletIntent>
  ): Promise<CapturedIntent> {
    if (this.debug) {
      console.log("Capturing intent:", intent);
      return;
    }

    const capturedIntent = await this.storage.save(intent);

    this.notifyIntentCaptured(capturedIntent);

    const update = async (
      updates: Partial<WalletIntent>
    ): Promise<WalletIntent> => {
      const updatedIntent = await this.storage.save({
        ...capturedIntent,
        ...updates,
      });

      this.notifyIntentCaptured(capturedIntent);

      return updatedIntent;
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

  onIntentCaptured(listener: (intent: WalletIntent) => void): void {
    this.on("intentCaptured", listener);
  }
}
