import {
  InMemoryStorageAdapter,
  IntentManager,
  IntentSynchronizer,
  SandshrewRpcProvider,
} from "../src";
import {
  AssetType,
  IntentStatus,
  IntentType,
  TransactionType,
} from "../src/types";

import {
  IMAGE_PNG_BASE64,
  BRC20_TRANSFER_BASE64,
  WITNESS_SCRIPTS,
  IMAGE_GIF_BASE64,
} from "./mocks/constants";
import { mockRpcResponse, setupMockServer } from "./mocks/utils";

setupMockServer();

test("Updates intent as completed for confirmed transactions", async () => {
  mockRpcResponse("esplora_tx", "confirmed_tx.json");

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const synchronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await manager.captureIntent({
    address: "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
    type: IntentType.Transaction,
    status: IntentStatus.Pending,
    transactionType: TransactionType.Send,
    assetType: AssetType.BTC,
    transactionIds: [
      "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
    ],
    btcAmount: 100000,
  });

  const pendingIntents = await manager.retrieveAllIntents();
  expect(pendingIntents[0]).toHaveProperty("status", "pending");

  await synchronizer.syncPendingIntents([
    "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
  ]);

  const syncedIntents = await manager.retrieveAllIntents();
  expect(syncedIntents[0]).toHaveProperty("status", "completed");
});

test("Handles transactions without a status", async () => {
  mockRpcResponse("esplora_tx", {
    result: {},
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const synchronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await manager.captureIntent({
    address: "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
    type: IntentType.Transaction,
    status: IntentStatus.Pending,
    transactionType: TransactionType.Send,
    assetType: AssetType.BTC,
    transactionIds: [
      "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
    ],
    btcAmount: 100000,
  });

  const pendingIntents = await manager.retrieveAllIntents();
  expect(pendingIntents[0]).toHaveProperty("status", "pending");

  await synchronizer.syncPendingIntents([
    "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
  ]);

  const syncedIntents = await manager.retrieveAllIntents();

  expect(syncedIntents[0]).toHaveProperty("status", "pending");
});

test("Handles transactions that have become stale (no tx ids)", async () => {
  mockRpcResponse("esplora_tx", {
    result: {},
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const synchronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await manager.captureIntent({
    address: "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
    type: IntentType.Transaction,
    status: IntentStatus.Pending,
    transactionType: TransactionType.Send,
    assetType: AssetType.BTC,
    transactionIds: [],
    btcAmount: 100000,
  });

  const pendingIntents = await manager.retrieveAllIntents();
  expect(pendingIntents[0]).toHaveProperty("status", "pending");

  await synchronizer.syncStaleIntents(
    ["tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln"],
    -1000
  );

  const syncedIntents = await manager.retrieveAllIntents();

  expect(syncedIntents[0]).toHaveProperty("status", "completed");
});

test("Handles transactions that have become stale (with invalid tx ids)", async () => {
  mockRpcResponse("esplora_tx", {
    result: {},
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const synchronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await manager.captureIntent({
    address: "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
    type: IntentType.Transaction,
    status: IntentStatus.Pending,
    transactionType: TransactionType.Send,
    assetType: AssetType.BTC,
    transactionIds: [],
    btcAmount: 100000,
  });

  await manager.captureIntent({
    address: "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
    type: IntentType.Transaction,
    status: IntentStatus.Pending,
    transactionType: TransactionType.Send,
    assetType: AssetType.BTC,
    transactionIds: ["Error: could not procees transaction"],
    btcAmount: 100000,
  });

  await manager.captureIntent({
    address: "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
    type: IntentType.Transaction,
    status: IntentStatus.Pending,
    transactionType: TransactionType.Send,
    assetType: AssetType.BTC,
    transactionIds: [
      "Error: could not procees transaction",
      "f7c5803c94d4372ca85d03bb94c833dc39eca447abdbf8f1a0e9e57927ad8784",
    ],
    btcAmount: 100000,
  });

  const pendingIntents = await manager.retrieveAllIntents();

  pendingIntents.forEach((intent) => {
    expect(intent.status).toBe("pending");
  });

  await synchronizer.syncStaleIntents(
    ["tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln"],
    -1000
  );

  const syncedIntents = await manager.retrieveAllIntents();

  expect(syncedIntents[0]).toHaveProperty("status", "completed");
  expect(syncedIntents[1]).toHaveProperty("status", "completed");
  expect(syncedIntents[2]).toHaveProperty("status", "pending");
});

test("Handles transactions that have been replaced or corrupted", async () => {
  mockRpcResponse("esplora_tx", {
    result: "Transaction not found",
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const synchronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  const twoMinutesAgo = Date.now() - 120 * 1000;

  await manager.captureIntent({
    timestamp: twoMinutesAgo,
    address: "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
    type: IntentType.Transaction,
    status: IntentStatus.Pending,
    transactionType: TransactionType.Send,
    assetType: AssetType.BTC,
    transactionIds: [
      "f7c5803c94d4372ca85d03bb94c833dc39eca447abdbf8f1a0e9e57927ad8797",
    ],
    btcAmount: 100000,
  });

  await manager.captureIntent({
    timestamp: twoMinutesAgo,
    address: "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
    type: IntentType.Transaction,
    status: IntentStatus.Pending,
    transactionType: TransactionType.Send,
    assetType: AssetType.BTC,
    transactionIds: [
      "f7c5803c94d4372ca85d03bb94c833dc39eca447abdbf8f1a0e9e57927ad8797",
    ],
    btcAmount: 100000,
  });

  const pendingIntents = await manager.retrieveAllIntents();

  expect(pendingIntents[0].status).toBe("pending");

  await synchronizer.syncPendingIntents([
    "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
  ]);

  const syncedIntents = await manager.retrieveAllIntents();

  syncedIntents.forEach((intent) => {
    expect(intent).toHaveProperty("status", "completed");
  });
  expect(syncedIntents[0].transactionIds).toHaveLength(0);
});

test("Handles transactions with errors", async () => {
  mockRpcResponse("esplora_address::txs", {
    result: undefined,
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const provider = new SandshrewRpcProvider("http://localhost:3000/v1/regtest");

  const syncronizer = new IntentSynchronizer(manager, provider);

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();
  expect(intents).toHaveLength(0);
});

test("Does not sync intents from chain for transactions that were confirmed before the syncFromTimestamp", async () => {
  mockRpcResponse("esplora_address::txs", "confirmed_old_tx.json");
  mockRpcResponse("ord_output", "not_indexed.json");

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain(
    ["tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"],
    Date.now()
  );

  const intents = await manager.retrieveAllIntents();
  expect(intents).toHaveLength(0);
});

test("Receive BTC confirmed", async () => {
  mockRpcResponse("esplora_address::txs", "confirmed_tx.json");
  mockRpcResponse("ord_output", "indexed_without_assets.json");

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "completed");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
});

test("Receive BTC unconfirmed", async () => {
  mockRpcResponse("esplora_address::txs", "unconfirmed_tx.json");

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0]).toHaveProperty(
    "address",
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );

  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("assetType", "btc");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
});

test("Confirmed TX with Collectible in Outputs", async () => {
  mockRpcResponse("esplora_address::txs", "confirmed_tx.json");
  mockRpcResponse("ord_output", {
    result: {
      indexed: true,
      inscriptions: [
        "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
      ],
      runes: [],
    },
  });
  mockRpcResponse("ord_inscription", {
    result: {
      id: "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
      content_type: "image/png",
    },
  });
  mockRpcResponse("ord_content", {
    result: IMAGE_PNG_BASE64,
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0].address).toEqual(
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "completed");
  expect(intents[0]).toHaveProperty("assetType", "collectible");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty(
    "inscriptionId",
    "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0"
  );
  expect(intents[0]).toHaveProperty("content", IMAGE_PNG_BASE64);
  expect(intents[0]).toHaveProperty("contentType", "image/png");
});

test("Confirmed TX with BRC-20 in Outputs", async () => {
  mockRpcResponse("esplora_address::txs", "confirmed_tx.json");
  mockRpcResponse("ord_output", {
    result: {
      indexed: true,
      inscriptions: [
        "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
      ],
      runes: [],
    },
  });
  mockRpcResponse("ord_inscription", {
    result: {
      id: "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
      content_type: "text/plain;charset=utf-8",
    },
  });
  mockRpcResponse("ord_content", {
    result: BRC20_TRANSFER_BASE64,
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0].address).toEqual(
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "completed");
  expect(intents[0]).toHaveProperty("assetType", "brc-20");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty("btcAmount", 546);
  expect(intents[0]).toHaveProperty("ticker", "toyl");
  expect(intents[0]).toHaveProperty("tickerAmount", 1000);
  expect(intents[0]).toHaveProperty("operation", "transfer");
});

test("Unconfirmed TX with Collectible in Prevout", async () => {
  mockRpcResponse("esplora_address::txs", {
    result: [
      {
        txid: "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
        vin: [
          {
            txid: "68bf2613e71cf8cc8652bba6f138d713cf44992eb067b8eb35b707e9a35c4105",
            vout: 0,
            prevout: {},
            witness: [],
          },
        ],
        vout: [
          {
            scriptpubkey:
              "51207c096f59842eb86e772cf575fac55f707abb8b54c1d430980ee34959286f0e7d",
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
            value: 546,
          },
        ],
        status: {
          confirmed: false,
        },
      },
    ],
  });
  // TX output
  mockRpcResponse("ord_output", {
    result: {
      indexed: false,
      inscriptions: [],
      runes: [],
    },
  });
  // TX input/prevout
  mockRpcResponse("ord_output", {
    result: {
      indexed: true,
      inscriptions: [
        "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
      ],
      runes: [],
    },
  });
  mockRpcResponse("ord_inscription", {
    result: {
      id: "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
      content_type: "image/png",
    },
  });
  mockRpcResponse("ord_content", {
    result: IMAGE_PNG_BASE64,
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const synchronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await synchronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0].address).toEqual(
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("assetType", "collectible");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty("btcAmount", 546);
  expect(intents[0]).toHaveProperty(
    "inscriptionId",
    "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0"
  );
  expect(intents[0]).toHaveProperty("content", IMAGE_PNG_BASE64);
  expect(intents[0]).toHaveProperty("contentType", "image/png");
});

test("Unconfirmed TX with BRC-20 in Prevout", async () => {
  mockRpcResponse("esplora_address::txs", {
    result: [
      {
        txid: "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
        vin: [
          {
            txid: "68bf2613e71cf8cc8652bba6f138d713cf44992eb067b8eb35b707e9a35c4105",
            vout: 0,
            prevout: {},
            witness: [],
          },
        ],
        vout: [
          {
            scriptpubkey:
              "51207c096f59842eb86e772cf575fac55f707abb8b54c1d430980ee34959286f0e7d",
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
            value: 546,
          },
        ],
        status: {
          confirmed: false,
        },
      },
    ],
  });
  // TX output
  mockRpcResponse("ord_output", {
    result: {
      indexed: false,
      inscriptions: [],
      runes: [],
    },
  });
  // TX input/prevout
  mockRpcResponse("ord_output", {
    result: {
      indexed: true,
      inscriptions: [
        "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
      ],
      runes: [],
    },
  });
  mockRpcResponse("ord_inscription", {
    result: {
      id: "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
      content_type: "image/text;charset=utf-8",
    },
  });
  mockRpcResponse("ord_content", {
    result: BRC20_TRANSFER_BASE64,
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const synchronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await synchronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0].address).toEqual(
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("assetType", "brc-20");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty("btcAmount", 546);
  expect(intents[0]).toHaveProperty("tickerAmount", 1000);
  expect(intents[0]).toHaveProperty("ticker", "toyl");
  expect(intents[0]).toHaveProperty("operation", "transfer");
});

test("Uconfirmed TX with Collectible in Input Witness", async () => {
  mockRpcResponse("esplora_address::txs", {
    result: [
      {
        txid: "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
        vin: [
          {
            txid: "68bf2613e71cf8cc8652bba6f138d713cf44992eb067b8eb35b707e9a35c4105",
            vout: 1,
            prevout: {},
            witness: WITNESS_SCRIPTS.IMAGE_PNG,
          },
        ],
        vout: [
          {
            scriptpubkey:
              "51207c096f59842eb86e772cf575fac55f707abb8b54c1d430980ee34959286f0e7d",
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
            value: 546,
          },
        ],
        status: {
          confirmed: false,
        },
      },
    ],
  });
  mockRpcResponse("ord_output", {
    result: {
      indexed: false,
      inscriptions: [],
      runes: [],
    },
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0].address).toEqual(
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("assetType", "collectible");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty("btcAmount", 546);
  expect(intents[0]).toHaveProperty(
    "inscriptionId",
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88fi0"
  );
  expect(intents[0]).toHaveProperty(
    "content",
    "iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFyWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4wLWMwMDEgNzkuYzAyMDRiMiwgMjAyMy8wMi8wOS0wNjoyNjoxNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI0LjUgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNC0wMi0yMVQyMjo1NDo0MSswMzowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjQtMDItMjFUMjM6MTE6NDcrMDM6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjQtMDItMjFUMjM6MTE6NDcrMDM6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmYyNTNiMDViLWNlOGQtMWQ0Yy04M2FhLWZjYjllM2JlMmU4YiIgeG1wTU06RG9jdW1lbnRJRD0i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"
  );
  expect(intents[0]).toHaveProperty("contentType", "image/png");
});

test("Uconfirmed TX with BRC-20 in Input Witness", async () => {
  mockRpcResponse("esplora_address::txs", {
    result: [
      {
        txid: "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
        vin: [
          {
            txid: "68bf2613e71cf8cc8652bba6f138d713cf44992eb067b8eb35b707e9a35c4105",
            vout: 1,
            prevout: {},
            witness: WITNESS_SCRIPTS.BRC20_DEPLOY,
          },
        ],
        vout: [
          {
            scriptpubkey:
              "51207c096f59842eb86e772cf575fac55f707abb8b54c1d430980ee34959286f0e7d",
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
            value: 546,
          },
        ],
        status: {
          confirmed: false,
        },
      },
    ],
  });
  mockRpcResponse("ord_output", {
    result: {
      indexed: false,
      inscriptions: [],
      runes: [],
    },
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0].address).toEqual(
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("assetType", "brc-20");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty("btcAmount", 546);
  expect(intents[0]).toHaveProperty("tickerAmount", null);
  expect(intents[0]).toHaveProperty("ticker", "toyl");
  expect(intents[0]).toHaveProperty("operation", "deploy");
  expect(intents[0]).toHaveProperty("max", 21000000);
  expect(intents[0]).toHaveProperty("limit", 1000);
});

test("Uconfirmed TX with BRC-20 in Prev Inputs Witness", async () => {
  mockRpcResponse("esplora_address::txs", {
    result: [
      {
        txid: "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
        vin: [
          {
            txid: "68bf2613e71cf8cc8652bba6f138d713cf44992eb067b8eb35b707e9a35c4105",
            vout: 0,
            prevout: {},
            witness: [],
          },
        ],
        vout: [
          {
            scriptpubkey:
              "51207c096f59842eb86e772cf575fac55f707abb8b54c1d430980ee34959286f0e7d",
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
            value: 546,
          },
        ],
        status: {
          confirmed: false,
        },
      },
    ],
  });
  mockRpcResponse("ord_output", {
    result: {
      indexed: false,
      inscriptions: [],
      runes: [],
    },
  });
  mockRpcResponse("esplora_tx", {
    result: {
      txid: "68bf2613e71cf8cc8652bba6f138d713cf44992eb067b8eb35b707e9a35c4105",
      vin: [
        {
          txid: "28bf2613e71cf8cc8652bba6f138d713cf44992eb067b8eb35b707e9a35c4101",
          vout: 0,
          prevout: {},
          witness: WITNESS_SCRIPTS.BRC20_TRANSFER,
        },
      ],
      vout: [
        {
          scriptpubkey:
            "51207c096f59842eb86e772cf575fac55f707abb8b54c1d430980ee34959286f0e7d",
          scriptpubkey_address:
            "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
          value: 546,
        },
      ],
      status: {
        confirmed: false,
      },
    },
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0].address).toEqual(
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("assetType", "brc-20");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty("btcAmount", 546);
  expect(intents[0]).toHaveProperty("tickerAmount", 200);
  expect(intents[0]).toHaveProperty("ticker", "betf");
  expect(intents[0]).toHaveProperty("operation", "transfer");
  expect(intents[0]).toHaveProperty("max", null);
  expect(intents[0]).toHaveProperty("limit", null);
});

test("Uconfirmed TX with Rune etching with inscription", async () => {
  mockRpcResponse("esplora_address::txs", "rune_etching_with_inscription.json");
  mockRpcResponse("ord_output", "not_indexed.json");

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0].address).toEqual(
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("assetType", "rune");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "58de9fbe38d2a0732480cc01376a530c2a51763e44ce41d38ed4e1d13e0ba877",
  ]);
  expect(intents[0]).toHaveProperty("btcAmount", 1092);
  expect(intents[0]).toHaveProperty("operation", "etching");
  expect(intents[0]).toHaveProperty("runeName", "KRYDROID•RUNES");
  expect(intents[0]).toHaveProperty("inscription.assetType", "collectible");
  expect(intents[0]).toHaveProperty("inscription.content", IMAGE_GIF_BASE64);
  expect(intents[0]).toHaveProperty("inscription.content_type", "image/gif");
});

test("Uconfirmed TX with Rune etching without inscription", async () => {
  mockRpcResponse("esplora_address::txs", "rune_etching.json");
  mockRpcResponse("ord_output", "not_indexed.json");
  mockRpcResponse("esplora_tx", "confirmed_tx.json");

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0].address).toEqual(
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("assetType", "rune");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "58de9fbe38d2a0732480cc01376a530c2a51763e44ce41d38ed4e1d13e0ba877",
  ]);
  expect(intents[0]).toHaveProperty("btcAmount", 546);
  expect(intents[0]).toHaveProperty("operation", "etching");
  expect(intents[0]).toHaveProperty("runeName", "KRYDROID•RUNES");
  expect(intents[0]).toHaveProperty("inscription", null);
});

test("Uconfirmed TX with Rune mint", async () => {
  mockRpcResponse("esplora_address::txs", "rune_mint.json");
  mockRpcResponse("ord_output", "not_indexed.json");
  mockRpcResponse("esplora_tx", "confirmed_tx.json");
  mockRpcResponse("ord_rune", "rune_mint_details.json");
  mockRpcResponse("ord_inscription", {
    result: {
      id: "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
      content_type: "image/png",
    },
  });
  mockRpcResponse("ord_content", {
    result: IMAGE_PNG_BASE64,
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0].address).toEqual(
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("assetType", "rune");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "96b035c6f9505871b50a4f32a6bab22d1d9f09c6af997abe13ad5981df9a4b0b",
  ]);
  expect(intents[0]).toHaveProperty("btcAmount", 546);
  expect(intents[0]).toHaveProperty("operation", "mint");
  expect(intents[0]).toHaveProperty("runeName", "I•KNOW•YOU•WANT•IT");
  expect(intents[0]).toHaveProperty("runeAmount", 1000000n);
  expect(intents[0]).toHaveProperty("runeDivisibility", 0);
  expect(intents[0]).toHaveProperty("inscription", {
    assetType: "collectible",
    content:
      "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",
    content_type: "image/png",
    id: "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
  });
});

test("Uconfirmed TX with Rune transfer", async () => {
  mockRpcResponse("esplora_address::txs", "rune_transfer.json");
  mockRpcResponse("ord_output", "not_indexed.json");
  mockRpcResponse("esplora_tx", "confirmed_tx.json");
  mockRpcResponse("ord_rune", "rune_details.json");
  mockRpcResponse("ord_inscription", {
    result: {
      id: "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
      content_type: "image/png",
    },
  });
  mockRpcResponse("ord_content", {
    result: IMAGE_PNG_BASE64,
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider("http://localhost:3000/v1/regtest")
  );

  await syncronizer.syncIntentsFromChain([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0].id).toBeTruthy();
  expect(intents[0].timestamp).toBeTruthy();
  expect(intents[0].address).toEqual(
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7"
  );
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("assetType", "rune");
  expect(intents[0]).toHaveProperty("transactionType", "receive");
  expect(intents[0]).toHaveProperty("transactionIds", [
    "58de9fbe38d2a0732480cc01376a530c2a51763e44ce41d38ed4e1d13e0ba877",
  ]);
  expect(intents[0]).toHaveProperty("btcAmount", 546);
  expect(intents[0]).toHaveProperty("operation", "transfer");
  expect(intents[0]).toHaveProperty("runeName", "ETCHNXCEHINAW");
  expect(intents[0]).toHaveProperty("runeAmount", 500n);
  expect(intents[0]).toHaveProperty("runeDivisibility", 2);
  expect(intents[0]).toHaveProperty("inscription", {
    assetType: "collectible",
    content:
      "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",
    content_type: "image/png",
    id: "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0",
  });
});
