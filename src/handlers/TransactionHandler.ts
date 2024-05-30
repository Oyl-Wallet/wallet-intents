import { IntentManager } from "../IntentManager";
import {
  parseBrc20Inscription,
  determineReceiverAddress,
  getInscriptionsFromInput,
  inscriptionIdsFromTxOutputs,
  isReceiveTx,
  txIntentExists,
} from "../helpers";
import {
  IntentStatus,
  EsploraTransaction,
  Inscription,
  RpcProvider,
  WalletIntent,
  IntentType,
  CategorizedAsset,
  AssetType,
  TransactionType,
  BRC20TransactionIntent,
  CollectibleTransactionIntent,
  BTCTransactionIntent,
} from "../types";
import { parseNumber } from "../utils";

export class TransactionHandler {
  private addresses: string[] = [];

  constructor(private manager: IntentManager, private provider: RpcProvider) {}

  async setAddresses(addresses: string[]) {
    this.addresses = addresses;
  }

  async handlePendingTransaction(intent: WalletIntent) {
    const txs = await Promise.all(
      intent.transactionIds.map((txId: string) => this.provider.getTxById(txId))
    );

    if (txs.every((tx: EsploraTransaction) => tx.status.confirmed)) {
      intent.status = IntentStatus.Completed;
      await this.manager.captureIntent(intent);
    }
  }

  async handleReceivedTransactions(addresses: string[]) {
    this.addresses = addresses;

    const intents = await this.manager.retrieveIntentsByAddresses(
      this.addresses
    );

    if (intents.some(({ transactionIds }) => transactionIds.length === 0))
      return;

    const txs = (
      await Promise.all(
        this.addresses.map((addr) => this.provider.getAddressTxs(addr))
      )
    ).flat();
    for (let tx of txs) {
      if (!isReceiveTx(tx, this.addresses) || txIntentExists(tx, intents))
        continue;
      await this.processReceiveTransaction(tx);
    }
  }

  private async processReceiveTransaction(tx: EsploraTransaction) {
    const inscriptions = await this.getInscriptions(tx);

    const categorizedAssets = this.categorizeInscriptions(inscriptions);

    const [asset] = categorizedAssets;

    const address = determineReceiverAddress(tx, this.addresses);
    const status = tx.status.confirmed
      ? IntentStatus.Completed
      : IntentStatus.Pending;

    switch (asset?.assetType) {
      case AssetType.BRC20:
        await this.manager.captureIntent({
          address,
          status,
          type: IntentType.Transaction,
          assetType: AssetType.BRC20,
          transactionType: TransactionType.Receive,
          transactionIds: [tx.txid],
          ticker: asset.tick,
          operation: asset.op,
          amount: parseNumber(asset.amt),
          max: parseNumber(asset.max),
          limit: parseNumber(asset.lim),
        } as BRC20TransactionIntent);
        break;

      case AssetType.COLLECTIBLE:
        await this.manager.captureIntent({
          address,
          status,
          type: IntentType.Transaction,
          assetType: AssetType.COLLECTIBLE,
          transactionType: TransactionType.Receive,
          transactionIds: [tx.txid],
          inscriptionId: asset.id,
          contentType: asset.content_type,
          content: asset.content,
        } as CollectibleTransactionIntent);
        break;

      default:
        await this.manager.captureIntent({
          address,
          status,
          type: IntentType.Transaction,
          assetType: AssetType.BTC,
          transactionType: TransactionType.Receive,
          transactionIds: [tx.txid],
        } as BTCTransactionIntent);
    }
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

  private categorizeInscriptions(
    inscriptions: Inscription[]
  ): CategorizedAsset[] {
    const assets: CategorizedAsset[] = [];

    for (let inscription of inscriptions) {
      const brc20 = parseBrc20Inscription(inscription);

      if (brc20) {
        assets.push({
          ...brc20,
          assetType: AssetType.BRC20,
        });
      } else {
        assets.push({
          ...inscription,
          assetType: AssetType.COLLECTIBLE,
        });
      }
    }
    return assets;
  }
}
