import { IntentManager } from "./IntentManager";
import {
  determineReceiverAddress,
  isReceiveTx,
  txIntentExists,
} from "./helpers";
import { DataProvider, Intent, IntentStatus, IntentType } from "./types";

export class IntentSynchronizer {
  private provider: DataProvider;
  private manager: IntentManager;

  constructor(manager: IntentManager, provider: DataProvider) {
    this.manager = manager;
    this.provider = provider;
  }

  async syncIntents() {
    const intents = await this.manager.retrieveAllIntents();

    for (const intent of intents) {
      if (intent.type !== IntentType.Transaction) continue;
      if (intent.status === IntentStatus.Pending) {
        await this.syncTxIntent(intent);
      }
    }
  }

  async syncReceivedTxIntents(addresses: string[]) {
    const intents = await this.manager.retrieveAllIntents();

    if (intents.some(({ status }) => status === IntentStatus.Pending)) return;

    const addressTxs = await Promise.all(
      addresses.map((address: string) => this.provider.getAddressTxs(address))
    );

    const txs = addressTxs.flat();

    for (let tx of txs) {
      if (!isReceiveTx(tx, addresses)) continue;
      if (txIntentExists(tx, intents)) continue;

      this.manager.captureIntent({
        address: determineReceiverAddress(tx, addresses),
        type: IntentType.Transaction,
        status: tx.status.confirmed
          ? IntentStatus.Completed
          : IntentStatus.Pending,
        data: { txIds: [tx.id] },
      });
    }
  }

  private async syncTxIntent(intent: Intent) {
    const txIds = intent.data.txIds;

    if (txIds.length === 0) return;

    const txs = await Promise.all(
      txIds.map((txId: string) => this.provider.getTxById(txId))
    );

    if (txs.every((tx) => tx.status.confirmed)) {
      intent.status = IntentStatus.Completed;
      await this.manager.captureIntent(intent);
    }
  }
}
