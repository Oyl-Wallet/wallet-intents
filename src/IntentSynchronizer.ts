import { IntentManager } from "./IntentManager";
import {
  parseBrc20Inscription,
  determineReceiverAddress,
  getInscriptionsFromInput,
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

      const addressesVoutIndexes = tx.vout
        .map((output, index) =>
          addresses.includes(output.scriptpubkey_address) ? index : null
        )
        .filter((index) => index !== null);

      const txOutputs = await Promise.all(
        addressesVoutIndexes.map((voutIndex) =>
          this.provider.getTxOutput(tx.id, voutIndex)
        )
      );

      const inscriptions = [];

      const txOutputsIndexed = txOutputs.every((output) => output.indexed);

      if (txOutputsIndexed) {
        const inscriptionIds = inscriptionIdsFromTxOutputs(txOutputs);

        for (let inscriptionId of inscriptionIds) {
          const inscription = await this.provider.getInscriptionById(
            inscriptionId
          );

          if (inscription.content_type.startsWith("text")) {
            // Maybe BRC-20
          } else {
            inscriptions.push(inscription);
          }
        }
      }

      if (inscriptions.length === 0) {
        const txPrevOutputs = await Promise.all(
          tx.vin.map(({ txid, vout }) => this.provider.getTxOutput(txid, vout))
        );

        const inscriptionIds = inscriptionIdsFromTxOutputs(txPrevOutputs);

        for (let inscriptionId of inscriptionIds) {
          const inscription = await this.provider.getInscriptionById(
            inscriptionId
          );

          if (inscription.content_type.startsWith("text")) {
            // Maybe BRC-20
          } else {
            inscriptions.push(inscription);
          }
        }
      }

      if (inscriptions.length === 0) {
        for (let input of tx.vin) {
          const decodedInscriptions = getInscriptionsFromInput(input);
          inscriptions.push(...decodedInscriptions);
        }
      }

      const collectibles = [];
      const brc20s = [];
      const runes = [];

      for (let inscription of inscriptions) {
        const brc20 = parseBrc20Inscription(inscription);

        if (brc20) {
          brc20s.push(brc20);
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
          txIds: [tx.txid],
          brc20s,
          collectibles,
          runes,
        },
      });
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
