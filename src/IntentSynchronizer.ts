import { IntentManager } from "./IntentManager";
import { TransactionHandler } from "./handlers";
import { IntentType, RpcProvider } from "./types";

export class IntentSynchronizer {
  private transactionHandler: TransactionHandler;

  constructor(private manager: IntentManager, provider: RpcProvider) {
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
    const intents = await this.manager.retrieveTransactionIntents();
    if (intents.every(({ transactionIds }) => transactionIds.length > 0)) {
      await this.transactionHandler.handleReceivedTransactions(addresses);
    }
  }
}
