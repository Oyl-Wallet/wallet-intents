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

test("Can udpate an intent by id", async () => {
  const intentManager = new IntentManager(new InMemoryStorageAdapter());

  const capturedIntent = await intentManager.captureIntent(nativeSegwitIntent);
  expect(capturedIntent.intent).toEqual(
    expect.objectContaining(nativeSegwitIntent)
  );

  const updatedIntent = await capturedIntent.update({
    transactionIds: ["updated"],
  });
  expect(updatedIntent).toEqual(
    expect.objectContaining({
      ...capturedIntent.intent,
      transactionIds: ["updated"],
    })
  );
});

test("Can retrieve all intents", async () => {
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

test("Can retrieve intents by addresses", async () => {
  const intentManager = new IntentManager(new InMemoryStorageAdapter());
  await intentManager.captureIntent(nativeSegwitIntent);
  await intentManager.captureIntent(taprootIntent);
  await intentManager.captureIntent(nestedSegwitIntent);

  const intents = await intentManager.retrieveIntentsByAddresses([
    nativeSegwitAddress,
  ]);

  expect(intents).toHaveLength(1);
  expect(intents[0]).toEqual(expect.objectContaining(nativeSegwitIntent));
});

test("Can retrieve intent by id correctly", async () => {
  const intentManager = new IntentManager(new InMemoryStorageAdapter());
  const capturedIntent = await intentManager.captureIntent(nativeSegwitIntent);

  const intent = await intentManager.retrieveIntentById(
    capturedIntent.intent.id
  );

  expect(intent).toEqual(expect.objectContaining(nativeSegwitIntent));
});

test("Can retrieve pending intents by addresses", async () => {
  const intentManager = new IntentManager(new InMemoryStorageAdapter());
  await intentManager.captureIntent(nativeSegwitIntent);
  await intentManager.captureIntent(nativeSegwitIntent);
  await intentManager.captureIntent({
    ...nativeSegwitIntent,
    status: IntentStatus.Completed,
  });

  const intents = await intentManager.retrievePendingIntentsByAddresses([
    nativeSegwitAddress,
  ]);

  expect(intents).toHaveLength(2);
});
