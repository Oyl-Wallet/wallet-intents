import { IntentManager } from "./IntentManager";
import { TransactionHandler } from "./handlers";
import { IntentProvider, IntentType } from "./types";

export class IntentSynchronizer {
  private transactionHandler: TransactionHandler;

  constructor(private manager: IntentManager, provider: IntentProvider) {
    this.transactionHandler = new TransactionHandler(manager, provider);
  }

  async syncPendingIntents() {
    const pendingIntents = await this.manager.retrievePendingIntents();
    await Promise.all(
      pendingIntents.map(async (intent) => {
        if (intent.type === IntentType.Transaction) {
          await this.transactionHandler.handlePendingTransaction(intent);
        }
      })
    );
  }

  async syncReceivedTxIntents(addresses: string[]) {
    const intents = await this.manager.retrieveAllIntents();
    if (intents.some(({ data }) => data.txIds.length === 0)) return;
    await this.transactionHandler.handleReceivedTransactions(addresses);
  }
}
