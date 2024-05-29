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
  InMemoryStorageAdapter: () => InMemoryStorageAdapter,
  IntentManager: () => IntentManager,
  IntentStatus: () => IntentStatus,
  IntentSynchronizer: () => IntentSynchronizer,
  IntentType: () => IntentType,
  PlasmoStorageAdapter: () => PlasmoStorageAdapter,
  SandshrewRpcProvider: () => SandshrewRpcProvider,
  TransactionDirection: () => TransactionDirection
});
module.exports = __toCommonJS(src_exports);

// src/types.ts
var IntentType = /* @__PURE__ */ ((IntentType2) => {
  IntentType2["Transaction"] = "transaction";
  return IntentType2;
})(IntentType || {});
var IntentStatus = /* @__PURE__ */ ((IntentStatus2) => {
  IntentStatus2["Pending"] = "pending";
  IntentStatus2["Completed"] = "completed";
  IntentStatus2["Failed"] = "failed";
  return IntentStatus2;
})(IntentStatus || {});
var TransactionDirection = /* @__PURE__ */ ((TransactionDirection2) => {
  TransactionDirection2["Inbound"] = "Inbound";
  TransactionDirection2["Outbound"] = "Outbound";
  return TransactionDirection2;
})(TransactionDirection || {});

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
  async getAllIntents() {
    return structuredClone(this.intents);
  }
  async getIntentsByAddresses(addresses) {
    const intents = this.intents.filter(
      (intent) => addresses.includes(intent.address)
    );
    return structuredClone(intents);
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
    const intents = await this.getAllIntents();
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
  async getAllIntents() {
    const intents = await this.storage.get(this.key);
    return intents || [];
  }
  async getIntentsByAddresses(addresses) {
    const intents = await this.getAllIntents();
    return intents.filter((intent) => addresses.includes(intent.address));
  }
  async purgeIntentsByAddresses(addresses) {
    const intents = await this.getAllIntents();
    const purgedIntents = intents.filter(
      (intent) => !addresses.includes(intent.address)
    );
    return this.storage.set(this.key, purgedIntents);
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
  const outputsToAddress = tx.vout.filter(
    (output) => addresses.includes(output.scriptpubkey_address)
  );
  const inputsFromAddress = tx.vin.some(
    (input) => addresses.includes(input.prevout.scriptpubkey_address)
  );
  return outputsToAddress.length > 0 && !inputsFromAddress;
}
function txIntentExists(tx, intents) {
  return intents.some((intent) => intent.data.txIds.includes(tx.txid));
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
function getInscriptionsFromInput(input) {
  if (input.witness.length < 3)
    return [];
  const inscriptions = [];
  const parsedInscriptions = (0, import_micro_ordinals.parseWitness)(
    input.witness.map((witness) => Uint8Array.from(Buffer.from(witness, "hex")))
  );
  for (let inscription of parsedInscriptions) {
    inscriptions.push({
      id: `${input.txid}i0`,
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
  return null;
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
      intent.data.txIds.map((txId) => this.provider.getTxById(txId))
    );
    if (txs.every((tx) => tx.status.confirmed)) {
      intent.status = "completed" /* Completed */;
      await this.manager.captureIntent(intent);
    }
  }
  async handleReceivedTransactions(addresses) {
    this.addresses = addresses;
    const intents = await this.manager.retrieveIntentsByAddresses(
      this.addresses
    );
    if (intents.some(({ data }) => data.txIds.length === 0))
      return;
    const txs = (await Promise.all(
      this.addresses.map((addr) => this.provider.getAddressTxs(addr))
    )).flat();
    for (let tx of txs) {
      if (!isReceiveTx(tx, this.addresses) || txIntentExists(tx, intents))
        continue;
      await this.processTransaction(tx);
    }
  }
  async processTransaction(tx) {
    const inscriptions = await this.getInscriptions(tx);
    const { brc20s, runes, collectibles } = this.categorizeInscriptions(inscriptions);
    const traits = /* @__PURE__ */ new Set();
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
    }
    if (collectibles.length > 0) {
      traits.add("collectible");
      collectibles.forEach((collectible) => {
        traits.add(collectible.content_type);
      });
    }
    const amountSats = determineReceiverAmount(tx, this.addresses);
    await this.manager.captureIntent({
      address: determineReceiverAddress(tx, this.addresses),
      type: "transaction" /* Transaction */,
      status: tx.status.confirmed ? "completed" /* Completed */ : "pending" /* Pending */,
      data: {
        txIds: [tx.txid],
        direction: "Inbound" /* Inbound */,
        amountSats,
        brc20s,
        collectibles,
        runes: [],
        traits: Array.from(traits)
      }
    });
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
    return tx.vin.flatMap((input) => getInscriptionsFromInput(input));
  }
  categorizeInscriptions(inscriptions) {
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
  async syncReceivedTxIntents(addresses) {
    const intents = await this.manager.retrieveAllIntents();
    if (intents.some(({ data }) => data.txIds.length === 0))
      return;
    await this.transactionHandler.handleReceivedTransactions(addresses);
  }
};

// src/IntentManager.ts
var IntentManager = class {
  constructor(storage, addresses = []) {
    this.storage = storage;
    this.addresses = addresses;
  }
  async captureIntent(intent) {
    await this.storage.save(intent);
  }
  async retrieveAllIntents() {
    return this.storage.getAllIntents();
  }
  async retrievePendingIntents() {
    const intents = await this.retrieveAllIntents();
    return intents.filter((intent) => intent.status === "pending" /* Pending */);
  }
  async retrieveIntentsByAddresses(addresses) {
    return this.storage.getIntentsByAddresses(addresses);
  }
  async getAddresses() {
    return this.addresses;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InMemoryStorageAdapter,
  IntentManager,
  IntentStatus,
  IntentSynchronizer,
  IntentType,
  PlasmoStorageAdapter,
  SandshrewRpcProvider,
  TransactionDirection
});
//# sourceMappingURL=index.js.map