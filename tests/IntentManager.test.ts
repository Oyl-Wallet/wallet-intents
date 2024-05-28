import { InMemoryStorage, IntentManager } from "../src";
import { IntentStatus, IntentType } from "../src/types";

const nativeSegwitAddress = "tb1q2nph3vjqsq4paqdy34f4qrk4x3uh4k2x3u3vq8";
const taprootAddress =
  "tb1p6qyjjf9037p3sshkmaum2ylgzwx353ts05zmrtvagu4wva6psrgqv0w7ln";
const nestedSegwitAddress = "3JvL6Ymt8MVWiCNHC7oWU6nLeHNJKLZGLN";

const nativeSegwitIntent = {
  address: nativeSegwitAddress,
  type: IntentType.Transaction,
  status: IntentStatus.Pending,
  data: { message: "Hello, world!" },
};

const taprootIntent = {
  address: taprootAddress,
  type: IntentType.Transaction,
  status: IntentStatus.Pending,
  data: { message: "Hello, world!" },
};

const nestedSegwitIntent = {
  address: nestedSegwitAddress,
  type: IntentType.Transaction,
  status: IntentStatus.Pending,
  data: { message: "Hello, world!" },
};

test("IntentManager can retrieve all intents correctly", async () => {
  const intentManager = new IntentManager(new InMemoryStorage());
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
  const intentManager = new IntentManager(new InMemoryStorage());
  await intentManager.captureIntent(nativeSegwitIntent);
  await intentManager.captureIntent(taprootIntent);
  await intentManager.captureIntent(nestedSegwitIntent);

  const intents = await intentManager.retrieveIntentsByAddresses([]);

  expect(intents).toHaveLength(0);
});

test("IntentManager can retrieve intents by addresses correctly (2 addresses)", async () => {
  const intentManager = new IntentManager(new InMemoryStorage());
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
