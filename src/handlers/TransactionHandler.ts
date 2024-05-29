import { IntentManager } from "../IntentManager";
import {
  parseBrc20Inscription,
  determineReceiverAddress,
  getInscriptionsFromInput,
  inscriptionIdsFromTxOutputs,
  isReceiveTx,
  txIntentExists,
  determineReceiverAmount,
} from "../helpers";
import {
  IntentType,
  IntentStatus,
  EsploraTransaction,
  Intent,
  BRC20Content,
  Inscription,
  RpcProvider,
  TransactionType,
} from "../types";

export class TransactionHandler {
  private addresses: string[] = [];

  constructor(private manager: IntentManager, private provider: RpcProvider) {}

  async setAddresses(addresses: string[]) {
    this.addresses = addresses;
  }

  async handlePendingTransaction(intent: Intent) {
    const txs = await Promise.all(
      intent.txIds.map((txId: string) => this.provider.getTxById(txId))
    );

    if (txs.every((tx) => tx.status.confirmed)) {
      intent.status = IntentStatus.Completed;
      await this.manager.captureIntent(intent);
    }
  }

  async handleReceivedTransactions(addresses: string[]) {
    this.addresses = addresses;

    const intents = await this.manager.retrieveIntentsByAddresses(
      this.addresses
    );
    if (intents.some(({ txIds }) => txIds.length === 0)) return;

    const txs = (
      await Promise.all(
        this.addresses.map((addr) => this.provider.getAddressTxs(addr))
      )
    ).flat();
    for (let tx of txs) {
      if (!isReceiveTx(tx, this.addresses) || txIntentExists(tx, intents))
        continue;
      await this.processTransaction(tx);
    }
  }

  private async processTransaction(tx: EsploraTransaction) {
    const inscriptions = await this.getInscriptions(tx);

    const { brc20s, runes, collectibles } =
      this.categorizeInscriptions(inscriptions);

    const traits = new Set<string>();

    if (brc20s.length > 0) {
      traits.add("token");
      traits.add("brc20");
      brc20s.forEach((brc20) => {
        traits.add(brc20.op);
      });
    }

    if (runes.length > 0) {
      traits.add("token");
      traits.add("rune");
      // TODO: Add rune traits like etching, mint, etc
    }

    if (collectibles.length > 0) {
      traits.add("collectible");
      collectibles.forEach((collectible) => {
        traits.add(collectible.content_type);
      });
    } else {
      traits.add("token");
    }

    const amountSats = determineReceiverAmount(tx, this.addresses);

    await this.manager.captureIntent({
      address: determineReceiverAddress(tx, this.addresses),
      type: IntentType.Transaction,
      status: tx.status.confirmed
        ? IntentStatus.Completed
        : IntentStatus.Pending,
      txType: TransactionType.Receive,
      txIds: [tx.txid],
      amountSats,
      brc20s,
      collectibles,
      runes: [],
      traits: Array.from(traits),
    });
  }

  private async getInscriptions(tx: EsploraTransaction): Promise<any[]> {
    let inscriptions = await this.getTxOutputsInscriptions(tx);
    if (inscriptions.length === 0) {
      inscriptions = await this.getPrevOutputsInscriptions(tx);
    }
    if (inscriptions.length === 0) {
      inscriptions = this.getInputInscriptions(tx);
    }
    return inscriptions;
  }

  private async getTxOutputsInscriptions(
    tx: EsploraTransaction
  ): Promise<any[]> {
    const voutIndexes = tx.vout
      .map((output, index) =>
        this.addresses.includes(output.scriptpubkey_address) ? index : null
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

  private async getPrevOutputsInscriptions(
    tx: EsploraTransaction
  ): Promise<any[]> {
    const txPrevOutputs = await Promise.all(
      tx.vin.map(({ txid, vout }) => this.provider.getTxOutput(txid, vout))
    );
    return Promise.all(
      inscriptionIdsFromTxOutputs(txPrevOutputs).map((id) =>
        this.provider.getInscriptionById(id)
      )
    );
  }

  private getInputInscriptions(tx: EsploraTransaction): any[] {
    return tx.vin.flatMap((input) => getInscriptionsFromInput(input));
  }

  private categorizeInscriptions(inscriptions: Inscription[]): {
    brc20s: BRC20Content[];
    runes: any[];
    collectibles: Inscription[];
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
    return { brc20s, runes: [], collectibles };
  }
}
