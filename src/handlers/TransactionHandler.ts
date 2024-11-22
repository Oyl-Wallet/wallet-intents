import { IntentManager } from "../IntentManager";
import {
  parseBrc20Inscription,
  determineReceiverAddress,
  getInscriptionsFromInput,
  inscriptionIdsFromTxOutputs,
  determineReceiverAmount,
  getRuneFromOutputs,
} from "../helpers";
import {
  IntentStatus,
  EsploraTransaction,
  Inscription,
  RpcProvider,
  WalletIntent,
  IntentType,
  CategorizedInscription,
  AssetType,
  TransactionType,
  BRC20TransactionIntent,
  CollectibleTransactionIntent,
  BTCTransactionIntent,
  RuneOperation,
  RuneMintTransactionIntent,
  RuneEtchingTransactionIntent,
  RuneTransferTransactionIntent,
} from "../types";
import { parseNumber } from "../utils";

export class TransactionHandler {
  private addresses: string[] = [];

  constructor(private manager: IntentManager, private provider: RpcProvider) {}

  private async setAddresses(addresses: string[]) {
    this.addresses = addresses;
  }

  async handlePendingTransaction(intent: WalletIntent) {
    const transactions = await Promise.all(
      intent.transactionIds.map((txId: string) => this.provider.getTxById(txId))
    );

    const now = Date.now();
    const TIMEOUT_MS = 90 * 1000; // 90 seconds

    // Should handle replaced txs
    const hasTimedOutTxs = transactions.some(
      (tx) => typeof tx === "string" && intent.timestamp + TIMEOUT_MS < now
    );

    const lastTx = transactions[transactions.length - 1];
    const isConfirmed = transactions.length > 0 && lastTx?.status?.confirmed;

    if (isConfirmed || hasTimedOutTxs) {
      intent.status = IntentStatus.Completed;
      await this.manager.captureIntent(intent);
    }
  }

  async handleStaleTransaction(intent: WalletIntent) {
    intent.status = IntentStatus.Completed;
    await this.manager.captureIntent(intent);
  }

  async handleTransactions(addresses: string[], syncFromTimestamp?: number) {
    this.setAddresses(addresses);

    const txs = await this.fetchAllTransactions();

    const filteredTxs = this.filterTransactionsByTimestamp(
      txs,
      syncFromTimestamp
    );

    await this.processNewTransactions(filteredTxs);
  }

  private async fetchAllTransactions() {
    const txs = await Promise.all(
      this.addresses.map(async (addr) => {
        const result = await this.provider.getAddressTxs(addr);
        return !result || typeof result === "string" ? [] : result;
      })
    );
    return txs.flat();
  }

  private filterTransactionsByTimestamp(
    txs: EsploraTransaction[],
    syncFromTimestamp?: number
  ) {
    if (!syncFromTimestamp) return txs;

    return txs.filter((tx) =>
      tx.status.confirmed
        ? tx.status.block_time * 1000 >= syncFromTimestamp
        : true
    );
  }

  private async processNewTransactions(
    txs: EsploraTransaction[]
  ): Promise<void> {
    for (const tx of txs) {
      const txExists = await this.txExists(tx);
      if (!txExists) {
        await this.processTransaction(tx);
      }
    }
  }

  private async processTransaction(tx: EsploraTransaction) {
    const inscriptions = await this.getInscriptions(tx);
    const [categorized] = this.categorizeInscriptions(inscriptions);
    const rune = getRuneFromOutputs(tx.vout);

    const address = determineReceiverAddress(tx, this.addresses);
    const status = tx.status.confirmed
      ? IntentStatus.Completed
      : IntentStatus.Pending;
    const btcAmount = determineReceiverAmount(tx, this.addresses);

    if (this.manager.debug) {
      console.log("Processing transaction", {
        address,
        status,
        btcAmount,
        inscriptions,
        categorized,
        rune,
      });
    }

    if (rune && categorized?.assetType !== AssetType.BRC20) {
      if (rune.etching) {
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          type: IntentType.Transaction,
          assetType: AssetType.RUNE,
          transactionType: TransactionType.Receive,
          transactionIds: [tx.txid],
          operation: RuneOperation.Etching,
          runeName: rune.etching.runeName,
          inscription: categorized || null,
        } as RuneEtchingTransactionIntent);
      } else if (rune.mint) {
        const runeId = `${rune.mint.block}:${rune.mint.tx}`;
        const runeDetails = await this.provider.getRuneById(runeId);

        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          runeId,
          type: IntentType.Transaction,
          assetType: AssetType.RUNE,
          transactionType: TransactionType.Receive,
          transactionIds: [tx.txid],
          operation: RuneOperation.Mint,
          runeName: runeDetails.entry.spaced_rune,
          runeAmount: BigInt(runeDetails.entry.terms.amount),
          runeDivisibility: runeDetails.entry.divisibility,
          inscription: categorized || null,
        } as RuneMintTransactionIntent);
      } else {
        const { amount, id } = rune.edicts[0];
        const runeId = `${id.block}:${id.tx}`;
        const runeDetails = await this.provider.getRuneById(runeId);

        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          runeId,
          type: IntentType.Transaction,
          assetType: AssetType.RUNE,
          transactionType: TransactionType.Receive,
          transactionIds: [tx.txid],
          operation: RuneOperation.Transfer,
          runeName: runeDetails.entry.spaced_rune,
          runeAmount: amount,
          runeDivisibility: runeDetails.entry.divisibility,
          inscription: categorized || null,
        } as RuneTransferTransactionIntent);
      }

      return;
    }

    switch (categorized?.assetType) {
      case AssetType.BRC20:
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          type: IntentType.Transaction,
          assetType: AssetType.BRC20,
          transactionType: TransactionType.Receive,
          transactionIds: [tx.txid],
          ticker: categorized.tick,
          tickerAmount: categorized.amt ? Number(categorized.amt) : null,
          operation: categorized.op,
          max: parseNumber(categorized.max),
          limit: parseNumber(categorized.lim),
        } as BRC20TransactionIntent);
        break;

      case AssetType.COLLECTIBLE:
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          type: IntentType.Transaction,
          assetType: AssetType.COLLECTIBLE,
          transactionType: TransactionType.Receive,
          transactionIds: [tx.txid],
          inscriptionId: categorized.id,
          contentType: categorized.content_type,
          content: categorized.content,
        } as CollectibleTransactionIntent);
        break;

      default:
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          type: IntentType.Transaction,
          assetType: AssetType.BTC,
          transactionType: TransactionType.Receive,
          transactionIds: [tx.txid],
        } as BTCTransactionIntent);
    }
  }

  private async txExists(tx: EsploraTransaction) {
    const intents = await this.manager.retrieveIntentsByAddresses(
      this.addresses
    );
    return !!intents.find((intent) => intent.transactionIds.includes(tx.txid));
  }

  private async getInscriptions(
    tx: EsploraTransaction
  ): Promise<Inscription[]> {
    let inscriptions = await this.getTxOutputsInscriptions(tx);
    if (inscriptions.length === 0) {
      inscriptions = await this.getPrevOutputsInscriptions(tx);
    }
    if (inscriptions.length === 0) {
      inscriptions = this.getInputInscriptions(tx);
    }
    if (inscriptions.length === 0) {
      inscriptions = await this.getPrevInputsInscriptions(tx);
    }
    if (inscriptions.length === 0) {
      inscriptions = await this.getRuneTxInscriptions(tx);
    }

    return inscriptions;
  }

  private async getTxOutputsInscriptions(
    tx: EsploraTransaction
  ): Promise<any[]> {
    if (!tx.status.confirmed) {
      return [];
    }

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

    const isIndexed =
      txOutputs.length > 0 && txOutputs.every((output) => output.indexed);

    if (isIndexed) {
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

  private getInputInscriptions(tx: EsploraTransaction): Inscription[] {
    return tx.vin.flatMap((input) => getInscriptionsFromInput(input, tx.txid));
  }

  private async getPrevInputsInscriptions(
    tx: EsploraTransaction
  ): Promise<Inscription[]> {
    const prevTxs = await Promise.all(
      tx.vin.map((input) => this.provider.getTxById(input.txid))
    );

    const prevInputsInscriptions = prevTxs.flatMap((prevTx) =>
      prevTx.vin.flatMap((input) =>
        getInscriptionsFromInput(input, prevTx.txid)
      )
    );
    return prevInputsInscriptions;
  }

  private async getRuneTxInscriptions(
    tx: EsploraTransaction
  ): Promise<Inscription[]> {
    const rune = getRuneFromOutputs(tx.vout);

    if (!rune) {
      return [];
    }

    let runeId: string;

    if (rune.edicts?.length > 0) {
      const { id } = rune.edicts[0];
      runeId = `${id.block}:${id.tx}`;
    } else if (rune.mint) {
      runeId = `${rune.mint.block}:${rune.mint.tx}`;
    }

    if (runeId) {
      const runeDetails = await this.provider.getRuneById(runeId);
      const inscription = await this.provider.getInscriptionById(
        `${runeDetails.entry.etching}i0`
      );

      if (typeof inscription !== "string") {
        return [inscription];
      }
    }

    return [];
  }

  private categorizeInscriptions(
    inscriptions: Inscription[]
  ): CategorizedInscription[] {
    const categorized: CategorizedInscription[] = [];

    for (let inscription of inscriptions) {
      const brc20 = parseBrc20Inscription(inscription);

      if (brc20) {
        categorized.push({
          ...brc20,
          assetType: AssetType.BRC20,
        });
      } else {
        categorized.push({
          ...inscription,
          assetType: AssetType.COLLECTIBLE,
        });
      }
    }

    return categorized;
  }
}
