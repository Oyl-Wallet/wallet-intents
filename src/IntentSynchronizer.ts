import { IntentManager } from "./IntentManager";
import { TransactionHandler } from "./handlers";
import { IntentType, RpcProvider } from "./types";

export class IntentSynchronizer {
  private transactionHandler: TransactionHandler;

  constructor(private manager: IntentManager, provider: RpcProvider) {
    this.transactionHandler = new TransactionHandler(manager, provider);
  }

  async syncIntents(addresses: string[]) {
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

  async syncIntentsFromChain(addresses: string[]) {
    const intents = await this.manager.retrieveIntentsByAddresses(addresses);
    if (intents.every(({ transactionIds }) => transactionIds.length > 0)) {
      await this.transactionHandler.handleTransactions(addresses);
    }
  }
}
