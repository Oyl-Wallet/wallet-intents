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
  IntentSynchronizer: () => IntentSynchronizer,
  SandshrewRpcProvider: () => SandshrewRpcProvider
});
module.exports = __toCommonJS(src_exports);

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
};

// src/helpers.ts
function isReceiveTx(tx, addresses) {
  const outputsToAddress = tx.vout.filter(
    (output) => addresses.includes(output.scriptpubkey_address)
  );
  const inputsFromAddress = tx.vin.some(
    (input) => addresses.includes(input.prevout.scriptpubkey_address)
  );
  return outputsToAddress.length <= 0 || inputsFromAddress;
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

// src/IntentSynchronizer.ts
var IntentSynchronizer = class {
  provider;
  manager;
  constructor(manager, provider) {
    this.manager = manager;
    this.provider = provider;
  }
  async syncIntents() {
    const intents = await this.manager.retrieveAllIntents();
    for (const intent of intents) {
      if (intent.type !== "transaction" /* Transaction */)
        continue;
      if (intent.status === "pending" /* Pending */) {
        await this.syncTxIntent(intent);
      }
    }
  }
  async syncReceivedTxIntents(addresses) {
    const intents = await this.manager.retrieveAllIntents();
    if (intents.some(({ status }) => status === "pending" /* Pending */))
      return;
    const addressTxs = await Promise.all(
      addresses.map((address) => this.provider.getAddressTxs(address))
    );
    const txs = addressTxs.flat();
    for (let tx of txs) {
      if (!isReceiveTx(tx, addresses))
        continue;
      if (txIntentExists(tx, intents))
        continue;
      this.manager.captureIntent({
        address: determineReceiverAddress(tx, addresses),
        type: "transaction" /* Transaction */,
        status: tx.status.confirmed ? "completed" /* Completed */ : "pending" /* Pending */,
        data: { txIds: [tx.id] }
      });
    }
  }
  async syncTxIntent(intent) {
    const txIds = intent.data.txIds;
    if (txIds.length === 0)
      return;
    const txs = await Promise.all(
      txIds.map((txId) => this.provider.getTxById(txId))
    );
    if (txs.every((tx) => tx.status.confirmed)) {
      intent.status = "completed" /* Completed */;
      await this.manager.captureIntent(intent);
    }
  }
};

// src/IntentManager.ts
var IntentManager = class {
  storage;
  constructor(storage) {
    this.storage = storage;
  }
  async captureIntent(intent) {
    await this.storage.save(intent);
  }
  async retrieveAllIntents() {
    return this.storage.getAllIntents();
  }
  async retrieveIntentsByAddresses(addresses) {
    return this.storage.getIntentsByAddresses(addresses);
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  InMemoryStorageAdapter,
  IntentManager,
  IntentSynchronizer,
  SandshrewRpcProvider
});
