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
function inscriptionIdsFromTxOutputs(txOutputs) {
  let inscriptionIds = [];
  for (let output of txOutputs) {
    inscriptionIds = inscriptionIds.concat(output.inscriptions);
  }
  return inscriptionIds;
}
function getInscriptionsFromInput(input) {
  if (input.witness.length === 0)
    return [];
  const parsedInscriptions = (0, import_micro_ordinals.parseWitness)(
    input.witness.map((witness) => Uint8Array.from(Buffer.from(witness, "hex")))
  );
  const inscriptions = [];
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
      if (intent.type === "transaction" /* Transaction */) {
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
      const addressesVoutIndexes = tx.vout.map(
        (output, index) => addresses.includes(output.scriptpubkey_address) ? index : null
      ).filter((index) => index !== null);
      const txOutputs = await Promise.all(
        addressesVoutIndexes.map(
          (voutIndex) => this.provider.getTxOutput(tx.id, voutIndex)
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
        type: "transaction" /* Transaction */,
        status: tx.status.confirmed ? "completed" /* Completed */ : "pending" /* Pending */,
        data: {
          txIds: [tx.id],
          brc20s,
          collectibles,
          runes
        }
      });
    }
  }
  async syncTxIntent(intent) {
    if (intent.status !== "pending" /* Pending */)
      return;
    if (intent.data.txIds.length === 0)
      return;
    const txs = await Promise.all(
      intent.data.txIds.map((txId) => this.provider.getTxById(txId))
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
