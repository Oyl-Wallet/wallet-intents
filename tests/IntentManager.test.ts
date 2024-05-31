import { InMemoryStorageAdapter, IntentManager } from "../src";
import {
  AssetType,
  IntentStatus,
  IntentType,
  TransactionType,
} from "../src/types";

const nativeSegwitAddress = "tb1q2nph3vjqsq4paqdy34f4qrk4x3uh4k2x3u3vq8";
const taprootAddress =
  "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln";
const nestedSegwitAddress = "3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN";

const nativeSegwitIntent = {
  address: nativeSegwitAddress,
  type: IntentType.Transaction,
  status: IntentStatus.Pending,
  transactionType: TransactionType.Send,
  assetType: AssetType.BTC,
  transactionIds: [
    "b3a8ab2cefdc960e398985b153674fcf764960fadf51f3e4ce119bfe47d88d52",
  ],
  btcAmount: 10000,
};

const taprootIntent = {
  address: taprootAddress,
  type: IntentType.Transaction,
  status: IntentStatus.Pending,
  transactionType: TransactionType.Send,
  assetType: AssetType.BTC,
  transactionIds: [
    "b3a8ab2cefdc960e398985b153674fcf764960fadf51f3e4ce119bfe47d88d52",
  ],
  btcAmount: 10000,
};

const nestedSegwitIntent = {
  address: nestedSegwitAddress,
  type: IntentType.Transaction,
  status: IntentStatus.Pending,
  transactionType: TransactionType.Send,
  assetType: AssetType.BTC,
  transactionIds: [
    "b3a8ab2cefdc960e398985b153674fcf764960fadf51f3e4ce119bfe47d88d52",
  ],
  btcAmount: 10000,
};

test("IntentManager can retrieve all intents correctly", async () => {
  const intentManager = new IntentManager(new InMemoryStorageAdapter());
  await intentManager.captureIntent(nativeSegwitIntent);
  await intentManager.captureIntent(taprootIntent);
  await intentManager.captureIntent(nestedSegwitIntent);

  const intents = await intentManager.retrieveAllIntents();

  expect(intents).toHaveLength(3);
  expect(intents[0]).toEqual(expect.objectContaining(nativeSegwitIntent));
  expect(intents[1]).toEqual(expect.objectContaining(taprootIntent));
  expect(intents[2]).toEqual(expect.objectContaining(nestedSegwitIntent));
});

test("IntentManager can retrieve intents by addresses correctly (0 addresses)", async () => {
  const intentManager = new IntentManager(new InMemoryStorageAdapter());
  await intentManager.captureIntent(nativeSegwitIntent);
  await intentManager.captureIntent(taprootIntent);
  await intentManager.captureIntent(nestedSegwitIntent);

  const intents = await intentManager.retrieveIntentsByAddresses([]);

  expect(intents).toHaveLength(0);
});

test("IntentManager can retrieve intents by addresses correctly (2 addresses)", async () => {
  const intentManager = new IntentManager(new InMemoryStorageAdapter());
  await intentManager.captureIntent(nativeSegwitIntent);
  await intentManager.captureIntent(taprootIntent);
  await intentManager.captureIntent(nestedSegwitIntent);

  const intents = await intentManager.retrieveIntentsByAddresses([
    nativeSegwitAddress,
    taprootAddress,
  ]);

  expect(intents).toHaveLength(2);
  expect(intents[0]).toEqual(expect.objectContaining(nativeSegwitIntent));
  expect(intents[1]).toEqual(expect.objectContaining(taprootIntent));
});
