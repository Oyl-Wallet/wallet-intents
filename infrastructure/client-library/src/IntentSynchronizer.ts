import { IntentManager } from "./IntentManager";
import { IntentSynchronizer as IntentSynchronizerInterface, RpcProvider } from "./types";

export class IntentSynchronizer implements IntentSynchronizerInterface {
  constructor(private manager: IntentManager, private provider: RpcProvider) {}

  async start(): Promise<void> {
    // The backend service handles synchronization automatically through WebSockets
    // This method is kept for API compatibility with the original IntentSynchronizer
    console.log("IntentSynchronizer started with backend service");
  }

  async syncPendingIntents(addresses: string[]): Promise<void> {
    // Fetch pending intents from the backend service
    await this.manager.retrievePendingIntentsByAddresses(addresses);
  }

  async syncStaleIntents(
    addresses: string[],
    expirationTimeMs = 3600000 /* 1 hour in ms */
  ): Promise<void> {
    // The backend service handles stale intents automatically
    // This method is kept for API compatibility
    console.log("Stale intents are handled by the backend service");
  }

  async syncIntentsFromChain(addresses: string[], syncFromTimestamp?: number): Promise<void> {
    // The backend service handles chain synchronization automatically
    // This method is kept for API compatibility
    console.log("Chain synchronization is handled by the backend service");
  }
}