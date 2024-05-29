import {
  InMemoryStorageAdapter,
  IntentManager,
  IntentSynchronizer,
  SandshrewRpcProvider,
} from "../src";
import { IntentStatus, IntentType, TransactionType } from "../src/types";

import {
  IMAGE_BASE64,
  BRC20_TRANSFER_BASE64,
  WITNESS_SCRIPTS,
} from "./mocks/constants";
import { mockRpcResponse, setupMockServer } from "./mocks/utils";

setupMockServer();

test("Updates intent as completed for confirmed transactions", async () => {
  mockRpcResponse("esplora_tx", {
    result: {
      status: {
        confirmed: true,
      },
    },
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const synchronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider({
      network: "regtest",
      projectId: "123",
    })
  );

  await manager.captureIntent({
    address: "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
    type: IntentType.Transaction,
    status: IntentStatus.Pending,
    txType: TransactionType.Send,
    txIds: [],
    amountSats: 10000,
    brc20s: [],
    collectibles: [],
    runes: [],
    traits: [],
  });

  const pendingIntents = await manager.retrieveAllIntents();
  expect(pendingIntents[0]).toHaveProperty("status", "pending");

  await synchronizer.syncPendingIntents();

  const syncedIntents = await manager.retrieveAllIntents();
  expect(syncedIntents[0]).toHaveProperty("status", "completed");
});

test("Receive BTC confirmed", async () => {
  mockRpcResponse("esplora_address::txs", {
    result: [
      {
        txid: "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
        vin: [],
        vout: [
          {
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
          },
        ],
        status: {
          confirmed: true,
        },
      },
    ],
  });
  mockRpcResponse("ord_output", {
    result: {
      indexed: true,
      inscriptions: [],
      runes: [],
    },
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider({
      network: "regtest",
      projectId: "123",
    })
  );

  await syncronizer.syncReceivedTxIntents([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "completed");
  expect(intents[0]).toHaveProperty("txIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty("collectibles", []);
  expect(intents[0]).toHaveProperty("brc20s", []);
  expect(intents[0]).toHaveProperty("runes", []);
  expect(intents[0]).toHaveProperty("traits", ["token", "btc"]);
});

test("Receive BTC unconfirmed", async () => {
  mockRpcResponse("esplora_address::txs", {
    result: [
      {
        txid: "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
        vin: [],
        vout: [
          {
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
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
      indexed: true,
      inscriptions: [],
      runes: [],
    },
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider({
      network: "regtest",
      projectId: "123",
    })
  );

  await syncronizer.syncReceivedTxIntents([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("txIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty("collectibles", []);
  expect(intents[0]).toHaveProperty("brc20s", []);
  expect(intents[0]).toHaveProperty("runes", []);
  expect(intents[0]).toHaveProperty("traits", ["token", "btc"]);
});

test("Confirmed TX with Collectible in Outputs", async () => {
  mockRpcResponse("esplora_address::txs", {
    result: [
      {
        txid: "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
        vin: [],
        vout: [
          {
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
          },
        ],
        status: {
          confirmed: true,
        },
      },
    ],
  });
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
    result: IMAGE_BASE64,
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const syncronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider({
      network: "regtest",
      projectId: "123",
    })
  );

  await syncronizer.syncReceivedTxIntents([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "completed");
  expect(intents[0]).toHaveProperty("txIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty(
    "collectibles[0].id",
    "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0"
  );
  expect(intents[0]).toHaveProperty(
    "collectibles[0].content_type",
    "image/png"
  );
  expect(intents[0]).toHaveProperty("collectibles[0].content", IMAGE_BASE64);
  expect(intents[0]).toHaveProperty("brc20s", []);
  expect(intents[0]).toHaveProperty("runes", []);
  expect(intents[0]).toHaveProperty("traits", ["collectible", "image/png"]);
});

test("Confirmed TX with BRC-20 in Outputs", async () => {
  mockRpcResponse("esplora_address::txs", {
    result: [
      {
        txid: "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
        vin: [],
        vout: [
          {
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
          },
        ],
        status: {
          confirmed: true,
        },
      },
    ],
  });
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
    new SandshrewRpcProvider({
      network: "regtest",
      projectId: "123",
    })
  );

  await syncronizer.syncReceivedTxIntents([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "completed");
  expect(intents[0]).toHaveProperty("txIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty("collectibles", []);
  expect(intents[0]).toHaveProperty("brc20s[0].p", "brc-20");
  expect(intents[0]).toHaveProperty("brc20s[0].op", "transfer");
  expect(intents[0]).toHaveProperty("brc20s[0].tick", "VMPX");
  expect(intents[0]).toHaveProperty("runes", []);
  expect(intents[0]).toHaveProperty("traits", ["token", "brc-20", "transfer"]);
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
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
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
    result: IMAGE_BASE64,
  });

  const manager = new IntentManager(new InMemoryStorageAdapter());
  const synchronizer = new IntentSynchronizer(
    manager,
    new SandshrewRpcProvider({
      network: "regtest",
      projectId: "123",
    })
  );

  await synchronizer.syncReceivedTxIntents([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("txIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty(
    "collectibles[0].id",
    "bb9ca79081bc51d968ab1b41766ccf4a5e920161e42fa1cb8854c853a83cc0cei0"
  );
  expect(intents[0]).toHaveProperty(
    "collectibles[0].content_type",
    "image/png"
  );
  expect(intents[0]).toHaveProperty("collectibles[0].content", IMAGE_BASE64);
  expect(intents[0]).toHaveProperty("brc20s", []);
  expect(intents[0]).toHaveProperty("runes", []);
  expect(intents[0]).toHaveProperty("traits", ["collectible", "image/png"]);
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
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
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
    new SandshrewRpcProvider({
      network: "regtest",
      projectId: "123",
    })
  );

  await synchronizer.syncReceivedTxIntents([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("txIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty("collectibles", []);
  expect(intents[0]).toHaveProperty("brc20s[0].p", "brc-20");
  expect(intents[0]).toHaveProperty("brc20s[0].op", "transfer");
  expect(intents[0]).toHaveProperty("brc20s[0].tick", "VMPX");
  expect(intents[0]).toHaveProperty("runes", []);
  expect(intents[0]).toHaveProperty("traits", ["token", "brc-20", "transfer"]);
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
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
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
    new SandshrewRpcProvider({
      network: "regtest",
      projectId: "123",
    })
  );

  await syncronizer.syncReceivedTxIntents([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("txIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty(
    "collectibles[0].id",
    "68bf2613e71cf8cc8652bba6f138d713cf44992eb067b8eb35b707e9a35c4105i0"
  );
  expect(intents[0]).toHaveProperty(
    "collectibles[0].content_type",
    "image/png"
  );
  expect(intents[0]).toHaveProperty(
    "collectibles[0].content",
    "iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFyWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4wLWMwMDEgNzkuYzAyMDRiMiwgMjAyMy8wMi8wOS0wNjoyNjoxNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI0LjUgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNC0wMi0yMVQyMjo1NDo0MSswMzowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjQtMDItMjFUMjM6MTE6NDcrMDM6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjQtMDItMjFUMjM6MTE6NDcrMDM6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmYyNTNiMDViLWNlOGQtMWQ0Yy04M2FhLWZjYjllM2JlMmU4YiIgeG1wTU06RG9jdW1lbnRJRD0i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"
  );
  expect(intents[0]).toHaveProperty("brc20s", []);
  expect(intents[0]).toHaveProperty("runes", []);
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
            scriptpubkey_address:
              "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
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
    new SandshrewRpcProvider({
      network: "regtest",
      projectId: "123",
    })
  );

  await syncronizer.syncReceivedTxIntents([
    "tb1pdykkv4ldhmw2n9mpehffjk7dszltheqkhjtg3hj7p97u33jja8cq4fuph7",
  ]);

  const intents = await manager.retrieveAllIntents();

  expect(intents).toHaveLength(1);
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "pending");
  expect(intents[0]).toHaveProperty("txIds", [
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f",
  ]);
  expect(intents[0]).toHaveProperty("collectibles", []);
  expect(intents[0]).toHaveProperty("brc20s[0].p", "brc-20");
  expect(intents[0]).toHaveProperty("brc20s[0].op", "deploy");
  expect(intents[0]).toHaveProperty("brc20s[0].tick", "PUPS");
  expect(intents[0]).toHaveProperty("brc20s[0].max", "7770000");
  expect(intents[0]).toHaveProperty("brc20s[0].lim", "777");
  expect(intents[0]).toHaveProperty("runes", []);
});
