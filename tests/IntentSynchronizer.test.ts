import {
  InMemoryStorageAdapter,
  IntentManager,
  IntentSynchronizer,
  SandshrewRpcProvider,
} from "../src";
import { IntentStatus, IntentType } from "../src/types";
import { server } from "./mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("It marks intent as completed for confirmed transactions", async () => {
  const storage = new InMemoryStorageAdapter();
  const intentManager = new IntentManager(new InMemoryStorageAdapter());
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
