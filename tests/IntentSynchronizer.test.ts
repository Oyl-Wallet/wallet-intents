import {
  InMemoryStorageAdapter,
  IntentManager,
  IntentSynchronizer,
  SandshrewRpcProvider,
} from "../src";
import { IntentStatus, IntentType } from "../src/types";
import { addresses, transactions } from "./constants";
import { server } from "./mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("It marks intent as completed for confirmed transactions", async () => {
  const storage = new InMemoryStorageAdapter();
  const intentManager = new IntentManager(storage);
  const intentSyncronizer = new IntentSynchronizer(
    intentManager,
    new SandshrewRpcProvider({
      network: "regtest",
      projectId: "123",
    })
  );

  await intentManager.captureIntent({
    address: "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln",
    type: IntentType.Transaction,
    status: IntentStatus.Pending,
    data: { txIds: ["confirmedTx"] },
  });

  let intents = await storage.getAllIntents();
  expect(intents[0]).toHaveProperty("status", "pending");

  await intentSyncronizer.syncIntents();

  intents = await storage.getAllIntents();
  expect(intents[0]).toHaveProperty("status", "completed");
});

test("It captures receive btc tx intents correctly", async () => {
  const storage = new InMemoryStorageAdapter();
  const intentManager = new IntentManager(storage);
  const intentSyncronizer = new IntentSynchronizer(
    intentManager,
    new SandshrewRpcProvider({
      network: "regtest",
      projectId: "123",
    })
  );

  let intents = await storage.getAllIntents();
  expect(intents).toHaveLength(0);

  await intentSyncronizer.syncReceivedTxIntents([
    addresses.RECEIVE_BTC_CONFIRMED,
  ]);

  intents = await storage.getAllIntents();
  expect(intents).toHaveLength(1);
  expect(intents[0]).toHaveProperty("type", "transaction");
  expect(intents[0]).toHaveProperty("status", "completed");
  expect(intents[0]).toHaveProperty("data.txIds", [
    transactions.RECEIVE_BTC_CONFIRMED,
  ]);
  expect(intents[0]).toHaveProperty("data.collectibles", []);
  expect(intents[0]).toHaveProperty("data.brc20s", []);
  expect(intents[0]).toHaveProperty("data.runes", []);
});
