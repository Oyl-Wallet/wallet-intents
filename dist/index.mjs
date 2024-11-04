// src/types.ts
var IntentStatus = /* @__PURE__ */ ((IntentStatus2) => {
  IntentStatus2["Pending"] = "pending";
  IntentStatus2["Completed"] = "completed";
  IntentStatus2["Failed"] = "failed";
  return IntentStatus2;
})(IntentStatus || {});
var IntentType = /* @__PURE__ */ ((IntentType2) => {
  IntentType2["Transaction"] = "transaction";
  return IntentType2;
})(IntentType || {});
var TransactionType = /* @__PURE__ */ ((TransactionType2) => {
  TransactionType2["Send"] = "send";
  TransactionType2["Receive"] = "receive";
  TransactionType2["Trade"] = "trade";
  TransactionType2["List"] = "list";
  TransactionType2["Claim"] = "claim";
  return TransactionType2;
})(TransactionType || {});
var AssetType = /* @__PURE__ */ ((AssetType2) => {
  AssetType2["BTC"] = "btc";
  AssetType2["BRC20"] = "brc-20";
  AssetType2["RUNE"] = "rune";
  AssetType2["COLLECTIBLE"] = "collectible";
  return AssetType2;
})(AssetType || {});
var BRC20Operation = /* @__PURE__ */ ((BRC20Operation2) => {
  BRC20Operation2["Deploy"] = "deploy";
  BRC20Operation2["Mint"] = "mint";
  BRC20Operation2["Transfer"] = "transfer";
  return BRC20Operation2;
})(BRC20Operation || {});
var RuneOperation = /* @__PURE__ */ ((RuneOperation2) => {
  RuneOperation2["Etching"] = "etching";
  RuneOperation2["Mint"] = "mint";
  RuneOperation2["Transfer"] = "transfer";
  return RuneOperation2;
})(RuneOperation || {});

// src/adapters/InMemoryStorageAdapter.ts
import { v4 as uuidv4 } from "uuid";
var InMemoryStorageAdapter = class {
  intents = [];
  async save(intent) {
    if ("id" in intent) {
      const index = this.intents.findIndex((i) => i.id === intent.id);
      if (index === -1) {
        throw new Error(`Intent with ID ${intent.id} not found`);
      }
      const existingIntent = this.intents[index];
      const updatedIntent = {
        ...existingIntent,
        ...intent,
        timestamp: existingIntent.timestamp
      };
      this.intents[index] = updatedIntent;
      return updatedIntent;
    } else {
      const newIntent = {
        ...intent,
        id: uuidv4(),
        timestamp: Date.now()
      };
      this.intents.push(newIntent);
      return newIntent;
    }
  }
  async findAll() {
    return this.intents.toSorted((a, b) => b.timestamp - a.timestamp);
  }
  async findByType(type) {
    return this.findAll().then(
      (intents) => intents.filter((intent) => intent.type === type)
    );
  }
  async findByStatus(status) {
    return this.findAll().then(
      (intents) => intents.filter((intent) => intent.status === status)
    );
  }
  async findByAddresses(addresses) {
    return this.findAll().then(
      (intents) => intents.filter((intent) => addresses.includes(intent.address))
    );
  }
  async findByStatusAndAddresses(status, addresses) {
    return this.findAll().then(
      (intents) => intents.filter(
        (intent) => intent.status === status && addresses.includes(intent.address)
      )
    );
  }
  async findById(intentId) {
    return this.findAll().then(
      (intents) => intents.find(({ id }) => id === intentId)
    );
  }
  async deleteAll() {
    this.intents = [];
  }
};

// src/adapters/PlasmoStorageAdapter.ts
import { Storage } from "@plasmohq/storage";
import { v4 as uuidv42 } from "uuid";
BigInt.prototype.toJSON = function() {
  return this.toString();
};
var PlasmoStorageAdapter = class {
  storage;
  key;
  constructor(key) {
    this.key = key;
    this.storage = new Storage({
      area: "local"
    });
  }
  async save(intent) {
    const intents = await this.findAll();
    let updatedIntent;
    if ("id" in intent) {
      const newIntents = intents.map((existingIntent) => {
        if (existingIntent.id === intent.id) {
          updatedIntent = {
            ...existingIntent,
            ...intent,
            timestamp: existingIntent.timestamp
          };
          return updatedIntent;
        }
        return existingIntent;
      });
      await this.storage.set(this.key, newIntents);
    } else {
      updatedIntent = {
        ...intent,
        id: uuidv42(),
        timestamp: Date.now()
      };
      intents.push(updatedIntent);
      await this.storage.set(this.key, intents);
    }
    return updatedIntent;
  }
  async findAll() {
    return this.storage.get(this.key).then((intents) => {
      const sortedIntents = (intents || []).sort(
        (a, b) => b.timestamp - a.timestamp
      );
      return sortedIntents;
    });
  }
  async findByType(type) {
    return this.findAll().then(
      (intents) => intents.filter((intent) => intent.type === type)
    );
  }
  async findByStatus(status) {
    return this.findAll().then(
      (intents) => intents.filter((intent) => intent.status === status)
    );
  }
  async findByAddresses(addresses) {
    return this.findAll().then(
      (intents) => intents.filter((intent) => addresses.includes(intent.address))
    );
  }
  async findByStatusAndAddresses(status, addresses) {
    return this.findAll().then(
      (intents) => intents.filter(
        (intent) => intent.status === status && addresses.includes(intent.address)
      )
    );
  }
  async findById(intentId) {
    return this.findAll().then(
      (intents) => intents.find((intent) => intent.id === intentId)
    );
  }
  async deleteAll() {
    await this.storage.remove(this.key);
  }
};

// src/providers/SandshrewRpcProvider.ts
var SandshrewRpcProvider = class {
  baseUrl;
  constructor(url) {
    this.baseUrl = url;
  }
  async getAddressTxs(address) {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "esplora_address::txs",
          params: [address]
        })
      });
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error(error);
    }
  }
  async getTxById(txId) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "esplora_tx",
        params: [txId]
      })
    });
    const data = await response.json();
    return data.result;
  }
  async getTxOutput(txId, voutIndex) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "ord_output",
        params: [`${txId}:${voutIndex}`]
      })
    });
    const data = await response.json();
    return data.result;
  }
  async getInscriptionById(inscriptionId) {
    const [inscriptionResponse, contentResponse] = await Promise.all([
      fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "ord_inscription",
          params: [inscriptionId]
        })
      }),
      fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "ord_content",
          params: [inscriptionId]
        })
      })
    ]);
    const inscriptionData = await inscriptionResponse.json();
    const contentData = await contentResponse.json();
    return {
      ...inscriptionData.result,
      content: contentData.result
    };
  }
  async getRuneById(runeId) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "ord_rune",
        params: [runeId]
      })
    });
    const data = await response.json();
    return data.result;
  }
};

// src/helpers.ts
import { parseWitness } from "micro-ordinals";
import { tryDecodeRunestone, isRunestone } from "@magiceden-oss/runestone-lib";
function determineReceiverAddress(tx, addresses) {
  for (const output of tx.vout) {
    if (addresses.includes(output.scriptpubkey_address)) {
      return output.scriptpubkey_address;
    }
  }
}
function determineReceiverAmount(tx, addresses) {
  let amount = 0;
  for (const output of tx.vout) {
    if (addresses.includes(output.scriptpubkey_address)) {
      amount += output.value;
    }
  }
  return amount;
}
function inscriptionIdsFromTxOutputs(txOutputs) {
  let inscriptionIds = [];
  for (let output of txOutputs) {
    inscriptionIds = inscriptionIds.concat(output.inscriptions);
  }
  return inscriptionIds;
}
function getInscriptionsFromInput(input, parentTxId) {
  if (!input.witness)
    return [];
  if (input.witness.length < 3)
    return [];
  const inscriptions = [];
  try {
    const parsedInscriptions = parseWitness(
      input.witness.map(
        (witness) => Uint8Array.from(Buffer.from(witness, "hex"))
      )
    );
    if (!parsedInscriptions) {
      return inscriptions;
    }
    for (let inscription of parsedInscriptions) {
      inscriptions.push({
        id: `${parentTxId}i0`,
        content_type: inscription.tags.contentType,
        content: uint8ArrayToBase64(inscription.body)
      });
    }
  } catch (error) {
    console.error("Error parsing inscriptions from input", error);
  }
  return inscriptions;
}
function getRuneFromOutputs(vout) {
  const asBtcoinCoreTxVout = vout.map((output) => ({
    scriptPubKey: {
      hex: output.scriptpubkey
    }
  }));
  const artifact = tryDecodeRunestone({ vout: asBtcoinCoreTxVout });
  if (artifact && isRunestone(artifact)) {
    return artifact;
  }
  return null;
}
function uint8ArrayToBase64(uint8Array) {
  let binaryString = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
}
function parseBrc20Inscription(inscription) {
  const contentBuffer = Buffer.from(inscription.content, "base64");
  try {
    let parsed = JSON.parse(contentBuffer.toString());
    if (parsed.p === "brc-20") {
      return parsed;
    }
  } catch {
  }
}

// src/utils.ts
function parseNumber(value) {
  if (!value)
    return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}
function isValidTxHash(hash) {
  if (!hash || typeof hash !== "string") {
    return false;
  }
  return /^[0-9a-f]{64}$/i.test(hash);
}

// src/handlers/TransactionHandler.ts
var TransactionHandler = class {
  constructor(manager, provider) {
    this.manager = manager;
    this.provider = provider;
  }
  addresses = [];
  async setAddresses(addresses) {
    this.addresses = addresses;
  }
  async handlePendingTransaction(intent) {
    const transactions = await Promise.all(
      intent.transactionIds.map((txId) => this.provider.getTxById(txId))
    );
    const isConfirmed = transactions.length > 0 && transactions.every((tx) => tx.status?.confirmed);
    if (isConfirmed) {
      intent.status = "completed" /* Completed */;
      await this.manager.captureIntent(intent);
    }
  }
  async handleStaleTransaction(intent) {
    intent.status = "completed" /* Completed */;
    await this.manager.captureIntent(intent);
  }
  async handleTransactions(addresses, syncFromTimestamp) {
    this.setAddresses(addresses);
    const txs = await this.fetchAllTransactions();
    const filteredTxs = this.filterTransactionsByTimestamp(
      txs,
      syncFromTimestamp
    );
    await this.processNewTransactions(filteredTxs);
  }
  async fetchAllTransactions() {
    const txs = await Promise.all(
      this.addresses.map(async (addr) => {
        const result = await this.provider.getAddressTxs(addr);
        return !result || typeof result === "string" ? [] : result;
      })
    );
    return txs.flat();
  }
  filterTransactionsByTimestamp(txs, syncFromTimestamp) {
    if (!syncFromTimestamp)
      return txs;
    return txs.filter(
      (tx) => tx.status.confirmed ? tx.status.block_time * 1e3 >= syncFromTimestamp : true
    );
  }
  async processNewTransactions(txs) {
    for (const tx of txs) {
      const txExists = await this.txExists(tx);
      if (!txExists) {
        await this.processTransaction(tx);
      }
    }
  }
  async processTransaction(tx) {
    const inscriptions = await this.getInscriptions(tx);
    const [categorized] = this.categorizeInscriptions(inscriptions);
    const rune = getRuneFromOutputs(tx.vout);
    const address = determineReceiverAddress(tx, this.addresses);
    const status = tx.status.confirmed ? "completed" /* Completed */ : "pending" /* Pending */;
    const btcAmount = determineReceiverAmount(tx, this.addresses);
    if (this.manager.debug) {
      console.log("Processing transaction", {
        address,
        status,
        btcAmount,
        inscriptions,
        categorized,
        rune
      });
    }
    if (rune && categorized?.assetType !== "brc-20" /* BRC20 */) {
      if (rune.etching) {
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          type: "transaction" /* Transaction */,
          assetType: "rune" /* RUNE */,
          transactionType: "receive" /* Receive */,
          transactionIds: [tx.txid],
          operation: "etching" /* Etching */,
          runeName: rune.etching.runeName,
          inscription: categorized || null
        });
      } else if (rune.mint) {
        const runeId = `${rune.mint.block}:${rune.mint.tx}`;
        const runeDetails = await this.provider.getRuneById(runeId);
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          runeId,
          type: "transaction" /* Transaction */,
          assetType: "rune" /* RUNE */,
          transactionType: "receive" /* Receive */,
          transactionIds: [tx.txid],
          operation: "mint" /* Mint */,
          runeName: runeDetails.entry.spaced_rune,
          runeAmount: BigInt(runeDetails.entry.terms.amount),
          runeDivisibility: runeDetails.entry.divisibility,
          inscription: categorized || null
        });
      } else {
        const { amount, id } = rune.edicts[0];
        const runeId = `${id.block}:${id.tx}`;
        const runeDetails = await this.provider.getRuneById(runeId);
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          runeId,
          type: "transaction" /* Transaction */,
          assetType: "rune" /* RUNE */,
          transactionType: "receive" /* Receive */,
          transactionIds: [tx.txid],
          operation: "transfer" /* Transfer */,
          runeName: runeDetails.entry.spaced_rune,
          runeAmount: amount,
          runeDivisibility: runeDetails.entry.divisibility,
          inscription: categorized || null
        });
      }
      return;
    }
    switch (categorized?.assetType) {
      case "brc-20" /* BRC20 */:
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          type: "transaction" /* Transaction */,
          assetType: "brc-20" /* BRC20 */,
          transactionType: "receive" /* Receive */,
          transactionIds: [tx.txid],
          ticker: categorized.tick,
          tickerAmount: categorized.amt ? Number(categorized.amt) : null,
          operation: categorized.op,
          max: parseNumber(categorized.max),
          limit: parseNumber(categorized.lim)
        });
        break;
      case "collectible" /* COLLECTIBLE */:
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          type: "transaction" /* Transaction */,
          assetType: "collectible" /* COLLECTIBLE */,
          transactionType: "receive" /* Receive */,
          transactionIds: [tx.txid],
          inscriptionId: categorized.id,
          contentType: categorized.content_type,
          content: categorized.content
        });
        break;
      default:
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          type: "transaction" /* Transaction */,
          assetType: "btc" /* BTC */,
          transactionType: "receive" /* Receive */,
          transactionIds: [tx.txid]
        });
    }
  }
  async txExists(tx) {
    const intents = await this.manager.retrieveIntentsByAddresses(
      this.addresses
    );
    return !!intents.find((intent) => intent.transactionIds.includes(tx.txid));
  }
  async getInscriptions(tx) {
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
  async getTxOutputsInscriptions(tx) {
    if (!tx.status.confirmed) {
      return [];
    }
    const voutIndexes = tx.vout.map(
      (output, index) => this.addresses.includes(output.scriptpubkey_address) ? index : null
    ).filter((index) => index !== null);
    const txOutputs = await Promise.all(
      voutIndexes.map(
        (voutIndex) => this.provider.getTxOutput(tx.txid, voutIndex)
      )
    );
    const isIndexed = txOutputs.length > 0 && txOutputs.every((output) => output.indexed);
    if (isIndexed) {
      return Promise.all(
        inscriptionIdsFromTxOutputs(txOutputs).map(
          (id) => this.provider.getInscriptionById(id)
        )
      );
    }
    return [];
  }
  async getPrevOutputsInscriptions(tx) {
    const txPrevOutputs = await Promise.all(
      tx.vin.map(({ txid, vout }) => this.provider.getTxOutput(txid, vout))
    );
    return Promise.all(
      inscriptionIdsFromTxOutputs(txPrevOutputs).map(
        (id) => this.provider.getInscriptionById(id)
      )
    );
  }
  getInputInscriptions(tx) {
    return tx.vin.flatMap((input) => getInscriptionsFromInput(input, tx.txid));
  }
  async getPrevInputsInscriptions(tx) {
    const prevTxs = await Promise.all(
      tx.vin.map((input) => this.provider.getTxById(input.txid))
    );
    const prevInputsInscriptions = prevTxs.flatMap(
      (prevTx) => prevTx.vin.flatMap(
        (input) => getInscriptionsFromInput(input, prevTx.txid)
      )
    );
    return prevInputsInscriptions;
  }
  async getRuneTxInscriptions(tx) {
    const rune = getRuneFromOutputs(tx.vout);
    if (!rune) {
      return [];
    }
    let runeId;
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
  categorizeInscriptions(inscriptions) {
    const categorized = [];
    for (let inscription of inscriptions) {
      const brc20 = parseBrc20Inscription(inscription);
      if (brc20) {
        categorized.push({
          ...brc20,
          assetType: "brc-20" /* BRC20 */
        });
      } else {
        categorized.push({
          ...inscription,
          assetType: "collectible" /* COLLECTIBLE */
        });
      }
    }
    return categorized;
  }
};

// src/IntentSynchronizer.ts
var IntentSynchronizer = class {
  constructor(manager, provider) {
    this.manager = manager;
    this.transactionHandler = new TransactionHandler(manager, provider);
  }
  transactionHandler;
  async syncPendingIntents(addresses) {
    const intents = await this.manager.retrievePendingIntentsByAddresses(
      addresses
    );
    await Promise.all(
      intents.map(async (intent) => {
        if (intent.type === "transaction" /* Transaction */) {
          await this.transactionHandler.handlePendingTransaction(intent);
        }
      })
    );
  }
  async syncStaleIntents(addresses, expirationTimeMs = 36e5) {
    const intents = await this.manager.retrievePendingIntentsByAddresses(
      addresses
    );
    const now = Date.now();
    await Promise.all(
      intents.map(async (intent) => {
        const isStale = now - intent.timestamp > expirationTimeMs;
        const validTxIds = intent.transactionIds.filter(
          (txId) => isValidTxHash(txId)
        );
        if (intent.type === "transaction" /* Transaction */ && validTxIds.length === 0 && isStale) {
          await this.transactionHandler.handleStaleTransaction(intent);
        }
      })
    );
  }
  async syncIntentsFromChain(addresses, syncFromTimestamp) {
    const intents = await this.manager.retrievePendingIntentsByAddresses(
      addresses
    );
    if (intents.every(({ transactionIds }) => transactionIds.length > 0)) {
      await this.transactionHandler.handleTransactions(
        addresses,
        syncFromTimestamp
      );
    }
  }
};

// src/IntentManager.ts
import { EventEmitter } from "events";
var IntentManager = class extends EventEmitter {
  constructor(storage, debug = false) {
    super();
    this.storage = storage;
    this.debug = debug;
  }
  notifyIntentCaptured(intent) {
    this.emit("intentCaptured", intent);
  }
  async captureIntent(intent) {
    if (this.debug) {
      console.log("Capturing intent:", intent);
      return;
    }
    const capturedIntent = await this.storage.save(intent);
    this.notifyIntentCaptured(capturedIntent);
    const update = async (updates) => {
      const updatedIntent = await this.storage.save({
        ...capturedIntent,
        ...updates
      });
      this.notifyIntentCaptured(capturedIntent);
      return updatedIntent;
    };
    return {
      intent: capturedIntent,
      update
    };
  }
  async retrieveAllIntents() {
    return this.storage.findAll();
  }
  async retrievePendingIntentsByAddresses(addresses) {
    return this.storage.findByStatusAndAddresses(
      "pending" /* Pending */,
      addresses
    );
  }
  async retrieveIntentsByAddresses(addresses) {
    return this.storage.findByAddresses(addresses);
  }
  async retrieveIntentById(intentId) {
    return this.storage.findById(intentId);
  }
  onIntentCaptured(listener) {
    this.on("intentCaptured", listener);
  }
};
export {
  AssetType,
  BRC20Operation,
  InMemoryStorageAdapter,
  IntentManager,
  IntentStatus,
  IntentSynchronizer,
  IntentType,
  PlasmoStorageAdapter,
  RuneOperation,
  SandshrewRpcProvider,
  TransactionType
};
//# sourceMappingURL=index.mjs.map