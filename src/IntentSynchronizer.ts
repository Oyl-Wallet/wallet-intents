import { IntentManager } from "./IntentManager";
import {
  determineReceiverAddress,
  inscriptionIdsFromTxOutputs,
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
      if (intent.type === IntentType.Transaction) {
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

      const addressVoutIndexes = tx.vout.reduce((result, output, index) => {
        if (addresses.includes(output.scriptpubkey_address)) {
          result.push(index);
        }
        return result;
      }, []);

      const txOutputs = await Promise.all(
        addressVoutIndexes.map((voutIndex) =>
          this.provider.getTxOutput(tx.id, voutIndex)
        )
      );

      if (txOutputs.every((output) => output.indexed)) {
        const inscriptionIds = inscriptionIdsFromTxOutputs(txOutputs);

        const collectibles = [];
        const brc20s = [];
        const runes = [];

        for (let inscriptionId of inscriptionIds) {
          const inscription = await this.provider.getInscriptionById(
            inscriptionId
          );

          if (inscription.content_type.startsWith("text")) {
            // Maybe BRC-20
          } else {
            collectibles.push(inscription);
          }
        }

        await this.manager.captureIntent({
          address: determineReceiverAddress(tx, addresses),
          type: IntentType.Transaction,
          status: tx.status.confirmed
            ? IntentStatus.Completed
            : IntentStatus.Pending,
          data: {
            txIds: [tx.id],
            brc20s,
            collectibles,
            runes,
          },
        });
      }
    }
  }

  private async syncTxIntent(intent: Intent) {
    if (intent.status !== IntentStatus.Pending) return;
    if (intent.data.txIds.length === 0) return;

    const txs = await Promise.all(
      intent.data.txIds.map((txId: string) => this.provider.getTxById(txId))
    );

    if (txs.every((tx) => tx.status.confirmed)) {
      intent.status = IntentStatus.Completed;
      await this.manager.captureIntent(intent);
    }
  }
}
