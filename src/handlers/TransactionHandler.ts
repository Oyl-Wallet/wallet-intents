import { IntentManager } from "../IntentManager";
import {
  parseBrc20Inscription,
  determineReceiverAddress,
  getInscriptionsFromInput,
  inscriptionIdsFromTxOutputs,
  isReceiveTx,
  txIntentExists,
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
  Rune,
  RuneTransactionIntent,
  RuneOperation,
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

    const isConfirmed =
      transactions.length > 0 &&
      transactions.every((tx: EsploraTransaction) => tx.status?.confirmed);

    if (isConfirmed) {
      intent.status = IntentStatus.Completed;
      await this.manager.captureIntent(intent);
    }
  }

  async handleTransactions(addresses: string[]) {
    this.setAddresses(addresses);

    const txs = (
      await Promise.all(
        this.addresses.map((addr) => this.provider.getAddressTxs(addr))
      )
    ).flat();

    const intents = await this.manager.retrieveIntentsByAddresses(
      this.addresses
    );

    for (let tx of txs) {
      if (this.manager.debug) {
        console.log("TX Exists", txIntentExists(tx, intents));
        console.log("Is Receive TX", isReceiveTx(tx, this.addresses));
      }

      if (!txIntentExists(tx, intents) && isReceiveTx(tx, this.addresses)) {
        await this.processTransaction(tx);
      }
    }
  }

  private async processTransaction(tx: EsploraTransaction) {
    const inscriptions = await this.getInscriptions(tx);
    const [categorized] = this.categorizeInscriptions(inscriptions);
    const rune = await this.getRune(tx);

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
      await this.manager.captureIntent({
        address,
        status,
        btcAmount,
        type: IntentType.Transaction,
        assetType: AssetType.RUNE,
        transactionType: TransactionType.Receive,
        transactionIds: [tx.txid],
        operation: RuneOperation.Etching,
        etching: rune.etching,
        inscription: categorized || null,
      } as RuneTransactionIntent);
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
          tickerAmount: parseNumber(categorized.amt),
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

    return inscriptions;
  }

  private async getRune(tx: EsploraTransaction) {
    const runes = getRuneFromOutputs(tx.vout);
    return runes;
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

  private getInputInscriptions(tx: EsploraTransaction): any[] {
    return tx.vin.flatMap((input) => getInscriptionsFromInput(input, tx.txid));
  }

  private async getPrevInputsInscriptions(
    tx: EsploraTransaction
  ): Promise<any[]> {
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
