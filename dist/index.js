var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  AssetType: () => AssetType,
  InMemoryStorageAdapter: () => InMemoryStorageAdapter,
  IntentManager: () => IntentManager,
  IntentStatus: () => IntentStatus,
  IntentSynchronizer: () => IntentSynchronizer,
  IntentType: () => IntentType,
  PlasmoStorageAdapter: () => PlasmoStorageAdapter,
  SandshrewRpcProvider: () => SandshrewRpcProvider,
  TransactionType: () => TransactionType
});
module.exports = __toCommonJS(src_exports);

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
  return TransactionType2;
})(TransactionType || {});
var AssetType = /* @__PURE__ */ ((AssetType2) => {
  AssetType2["BTC"] = "btc";
  AssetType2["BRC20"] = "brc-20";
  AssetType2["RUNE"] = "rune";
  AssetType2["COLLECTIBLE"] = "collectible";
  return AssetType2;
})(AssetType || {});

// src/adapters/InMemoryStorageAdapter.ts
var InMemoryStorageAdapter = class {
  intents = [];
  async save(intent) {
    if (intent.id) {
      const newIntents = this.intents.map((existingIntent) => {
        if (existingIntent.id === intent.id) {
          return structuredClone({
            ...existingIntent,
            ...intent
          });
        }
        return existingIntent;
      });
      this.intents = newIntents;
    } else {
      this.intents.push(
        structuredClone({
          ...intent,
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now()
        })
      );
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
  async findById(intentId) {
    return this.findAll().then(
      (intents) => intents.find(({ id }) => id === intentId)
    );
  }
};

// src/adapters/PlasmoStorageAdapter.ts
var import_storage = require("@plasmohq/storage");
var PlasmoStorageAdapter = class {
  storage;
  key;
  constructor(key) {
    this.key = key;
    this.storage = new import_storage.Storage({
      area: "local"
    });
  }
  async save(intent) {
    const intents = await this.findAll();
    if (intent.id) {
      const newIntents = intents.map((existingIntent) => {
        if (existingIntent.id === intent.id) {
          return {
            ...existingIntent,
            ...intent
          };
        }
        return existingIntent;
      });
      return this.storage.set(this.key, newIntents);
    } else {
      intents.push(
        structuredClone({
          ...intent,
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now()
        })
      );
      return this.storage.set(this.key, intents);
    }
  }
  async findAll() {
    return this.storage.get(this.key).then(
      (intents) => intents.sort((a, b) => b.timestamp - a.timestamp) || []
    );
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
  async findById(intentId) {
    return this.findAll().then(
      (intents) => intents.find((intent) => intent.id === intentId)
    );
  }
};

// src/providers/SandshrewRpcProvider.ts
var SandshrewRpcProvider = class {
  baseUrl;
  constructor({ network, projectId }) {
    if (network === "regtest") {
      this.baseUrl = "http://localhost:3000/v1/regtest";
    } else {
      this.baseUrl = `https://${network}.sandshrew.io/v1/${projectId}`;
    }
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
};

// src/helpers.ts
var import_micro_ordinals = require("micro-ordinals");
function isReceiveTx(tx, addresses) {
  const addressInOutput = tx.vout.find(
    (output) => addresses.includes(output.scriptpubkey_address)
  );
  const addressInInput = tx.vin.find(
    (input) => addresses.includes(input.prevout.scriptpubkey_address)
  );
  return !!addressInOutput && !addressInInput;
}
function txIntentExists(tx, intents) {
  return intents.find((intent) => intent.transactionIds.includes(tx.txid));
}
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
  if (input.witness.length < 3)
    return [];
  const inscriptions = [];
  const parsedInscriptions = (0, import_micro_ordinals.parseWitness)(
    input.witness.map((witness) => Uint8Array.from(Buffer.from(witness, "hex")))
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
  return inscriptions;
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
    const txs = await Promise.all(
      intent.transactionIds.map((txId) => this.provider.getTxById(txId))
    );
    if (txs.every((tx) => tx.status.confirmed)) {
      intent.status = "completed" /* Completed */;
      await this.manager.captureIntent(intent);
    }
  }
  async handleTransactions(addresses) {
    this.setAddresses(addresses);
    const txs = (await Promise.all(
      this.addresses.map((addr) => this.provider.getAddressTxs(addr))
    )).flat();
    const intents = await this.manager.retrieveIntentsByAddresses(
      this.addresses
    );
    for (let tx of txs) {
      if (txIntentExists(tx, intents))
        continue;
      await this.processTransaction(tx);
    }
  }
  async processTransaction(tx) {
    const inscriptions = await this.getInscriptions(tx);
    const categorizedAssets = this.categorizeInscriptions(inscriptions);
    const [asset] = categorizedAssets;
    const address = determineReceiverAddress(tx, this.addresses);
    const status = tx.status.confirmed ? "completed" /* Completed */ : "pending" /* Pending */;
    const btcAmount = determineReceiverAmount(tx, this.addresses);
    const transactionType = isReceiveTx(tx, this.addresses) ? "receive" /* Receive */ : "send" /* Send */;
    switch (asset?.assetType) {
      case "brc-20" /* BRC20 */:
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          transactionType,
          type: "transaction" /* Transaction */,
          assetType: "brc-20" /* BRC20 */,
          transactionIds: [tx.txid],
          ticker: asset.tick,
          tickerAmount: parseNumber(asset.amt),
          operation: asset.op,
          max: parseNumber(asset.max),
          limit: parseNumber(asset.lim)
        });
        break;
      case "collectible" /* COLLECTIBLE */:
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          transactionType,
          type: "transaction" /* Transaction */,
          assetType: "collectible" /* COLLECTIBLE */,
          transactionIds: [tx.txid],
          inscriptionId: asset.id,
          contentType: asset.content_type,
          content: asset.content
        });
        break;
      default:
        await this.manager.captureIntent({
          address,
          status,
          btcAmount,
          transactionType,
          type: "transaction" /* Transaction */,
          assetType: "btc" /* BTC */,
          transactionIds: [tx.txid]
        });
    }
  }
  async getInscriptions(tx) {
    let inscriptions = await this.getTxOutputsInscriptions(tx);
    if (inscriptions.length === 0) {
      inscriptions = await this.getPrevOutputsInscriptions(tx);
    }
    if (inscriptions.length === 0) {
      inscriptions = this.getInputInscriptions(tx);
    }
    return inscriptions;
  }
  async getTxOutputsInscriptions(tx) {
    const voutIndexes = tx.vout.map(
      (output, index) => this.addresses.includes(output.scriptpubkey_address) ? index : null
    ).filter((index) => index !== null);
    const txOutputs = await Promise.all(
      voutIndexes.map(
        (voutIndex) => this.provider.getTxOutput(tx.txid, voutIndex)
      )
    );
    if (txOutputs.every((output) => output.indexed)) {
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
  categorizeInscriptions(inscriptions) {
    const assets = [];
    for (let inscription of inscriptions) {
      const brc20 = parseBrc20Inscription(inscription);
      if (brc20) {
        assets.push({
          ...brc20,
          assetType: "brc-20" /* BRC20 */
        });
      } else {
        assets.push({
          ...inscription,
          assetType: "collectible" /* COLLECTIBLE */
        });
      }
    }
    return assets;
  }
};

// src/IntentSynchronizer.ts
var IntentSynchronizer = class {
  constructor(manager, provider) {
    this.manager = manager;
    this.transactionHandler = new TransactionHandler(manager, provider);
  }
  transactionHandler;
  async syncPendingIntents() {
    const pendingIntents = await this.manager.retrievePendingIntents();
    await Promise.all(
      pendingIntents.map(async (intent) => {
        if (intent.type === "transaction" /* Transaction */) {
          await this.transactionHandler.handlePendingTransaction(intent);
        }
      })
    );
  }
  async syncIntentsFromChain(addresses) {
    const intents = await this.manager.retrieveTransactionIntents();
    if (intents.every(({ transactionIds }) => transactionIds.length > 0)) {
      await this.transactionHandler.handleTransactions(addresses);
    }
  }
};

// src/IntentManager.ts
var IntentManager = class {
  constructor(storage, debug = false) {
    this.storage = storage;
    this.debug = debug;
  }
  async captureIntent(intent) {
    if (this.debug) {
      console.log("Capturing intent", intent);
    } else {
      return this.storage.save(intent);
    }
  }
  async retrieveAllIntents() {
    return this.storage.findAll();
  }
  async retrievePendingIntents() {
    return this.storage.findByStatus("pending" /* Pending */);
  }
  async retrieveIntentsByAddresses(addresses) {
    return this.storage.findByAddresses(addresses);
  }
  async retrieveIntentById(intentId) {
    return this.storage.findById(intentId);
  }
  async retrieveTransactionIntents() {
    return this.storage.findByType("transaction" /* Transaction */);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AssetType,
  InMemoryStorageAdapter,
  IntentManager,
  IntentStatus,
  IntentSynchronizer,
  IntentType,
  PlasmoStorageAdapter,
  SandshrewRpcProvider,
  TransactionType
});
//# sourceMappingURL=index.js.map