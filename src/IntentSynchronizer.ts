import { IntentManager } from "./IntentManager";
import {
  parseBrc20Inscription,
  determineReceiverAddress,
  getInscriptionsFromInput,
  inscriptionIdsFromTxOutputs,
  isReceiveTx,
  txIntentExists,
} from "./helpers";
import {
  BRC20Content,
  IntentProvider,
  EsploraTransaction,
  Inscription,
  Intent,
  IntentStatus,
  IntentType,
} from "./types";

export class IntentSynchronizer {
  private provider: IntentProvider;
  private manager: IntentManager;

  constructor(manager: IntentManager, provider: IntentProvider) {
    this.manager = manager;
    this.provider = provider;
  }

  async syncIntents() {
    const intents = await this.manager.retrieveAllIntents();
    await Promise.all(
      intents.map((intent) => {
        if (intent.type === IntentType.Transaction) {
          return this.syncTxIntent(intent);
        }
      })
    );
  }

  async syncReceivedTxIntents(addresses: string[]) {
    const intents = await this.manager.retrieveAllIntents();
    if (intents.some(({ status }) => status === IntentStatus.Pending)) return;

    const txs = (
      await Promise.all(
        addresses.map((addr) => this.provider.getAddressTxs(addr))
      )
    ).flat();
    for (let tx of txs) {
      if (!isReceiveTx(tx, addresses) || txIntentExists(tx, intents)) continue;
      await this.handleReceiveTransaction(tx, addresses);
    }
  }

  private async handleReceiveTransaction(
    tx: EsploraTransaction,
    addresses: string[]
  ) {
    const inscriptions = await this.getInscriptions(tx, addresses);

    const { brc20s, collectibles } = this.categorizeInscriptions(inscriptions);

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
        runes: [],
      },
    });
  }

  private async getInscriptions(
    tx: EsploraTransaction,
    addresses: string[]
  ): Promise<Inscription[]> {
    let inscriptions = await this.getTxOutputsInscriptions(tx, addresses);
    if (inscriptions.length === 0) {
      inscriptions = await this.getPrevOutputsInscriptions(tx);
    }
    if (inscriptions.length === 0) {
      inscriptions = this.getInputInscriptions(tx);
    }
    return inscriptions;
  }

  private async getTxOutputsInscriptions(
    tx: EsploraTransaction,
    addresses: string[]
  ): Promise<any[]> {
    const voutIndexes = tx.vout
      .map((output, index) =>
        addresses.includes(output.scriptpubkey_address) ? index : null
      )
      .filter((index) => index !== null);
    const txOutputs = await Promise.all(
      voutIndexes.map((voutIndex) =>
        this.provider.getTxOutput(tx.txid, voutIndex)
      )
    );

    if (txOutputs.every((output) => output.indexed)) {
      return Promise.all(
        inscriptionIdsFromTxOutputs(txOutputs).map((id) =>
          this.provider.getInscriptionById(id)
        )
      );
    }
    return [];
  }

  private async getPrevOutputsInscriptions(tx): Promise<any[]> {
    const txPrevOutputs = await Promise.all(
      tx.vin.map(({ txid, vout }) => this.provider.getTxOutput(txid, vout))
    );
    return Promise.all(
      inscriptionIdsFromTxOutputs(txPrevOutputs).map((id) =>
        this.provider.getInscriptionById(id)
      )
    );
  }

  private getInputInscriptions(tx): any[] {
    return tx.vin.flatMap((input) => getInscriptionsFromInput(input));
  }

  private categorizeInscriptions(inscriptions: any[]): {
    brc20s: BRC20Content[];
    collectibles: string[];
  } {
    const brc20s = [];
    const collectibles = [];
    for (let inscription of inscriptions) {
      const brc20 = parseBrc20Inscription(inscription);
      if (brc20) {
        brc20s.push(brc20);
      } else {
        collectibles.push(inscription);
      }
    }
    return { brc20s, collectibles };
  }

  private async syncTxIntent(intent: Intent) {
    if (
      intent.status !== IntentStatus.Pending ||
      intent.data.txIds.length === 0
    )
      return;

    const txs = await Promise.all(
      intent.data.txIds.map((txId) => this.provider.getTxById(txId))
    );
    if (txs.every((tx) => tx.status.confirmed)) {
      intent.status = IntentStatus.Completed;
      await this.manager.captureIntent(intent);
    }
  }
}
