import { IntentManager } from "./IntentManager";
import { TransactionHandler } from "./handlers";
import { IntentType, RpcProvider } from "./types";

export class IntentSynchronizer {
  private transactionHandler: TransactionHandler;

  constructor(private manager: IntentManager, provider: RpcProvider) {
    this.transactionHandler = new TransactionHandler(manager, provider);
  }

  async syncPendingIntents(addresses: string[]) {
    const intents = await this.manager.retrievePendingIntentsByAddresses(
      addresses
    );

    await Promise.all(
      intents.map(async (intent) => {
        if (intent.type === IntentType.Transaction) {
          await this.transactionHandler.handlePendingTransaction(intent);
        }
      })
    );
  }

  async syncStaleIntents(
    addresses: string[],
    expirationTimeMs = 3600000 /* 1 hour in ms */
  ) {
    const intents = await this.manager.retrievePendingIntentsByAddresses(
      addresses
    );

    const now = Date.now();

    await Promise.all(
      intents.map(async (intent) => {
        const isStale = now - intent.timestamp > expirationTimeMs;

        if (
          intent.type === IntentType.Transaction &&
          intent.transactionIds.length === 0 &&
          isStale
        ) {
          await this.transactionHandler.handleStaleTransaction(intent);
        }
      })
    );
  }

  async syncIntentsFromChain(addresses: string[], syncFromTimestamp?: number) {
    const intents = await this.manager.retrievePendingIntentsByAddresses(
      addresses
    );

    if (intents.every(({ transactionIds }) => transactionIds.length > 0)) {
      await this.transactionHandler.handleTransactions(
        addresses,
        syncFromTimestamp
      );
    }
  }
}
