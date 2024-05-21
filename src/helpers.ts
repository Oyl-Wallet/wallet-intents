import { parseWitness } from "micro-ordinals";
import { BRC20Content, Inscription } from "./types";

export function isReceiveTx(tx, addresses) {
  const outputsToAddress = tx.vout.filter((output) =>
    addresses.includes(output.scriptpubkey_address)
  );
  const inputsFromAddress = tx.vin.some((input) =>
    addresses.includes(input.prevout.scriptpubkey_address)
  );

  return outputsToAddress.length > 0 && !inputsFromAddress;
}

export function txIntentExists(tx, intents) {
  return intents.some((intent) => intent.data.txIds.includes(tx.txid));
}

export function determineReceiverAddress(tx, addresses: string[]) {
  for (const output of tx.vout) {
    if (addresses.includes(output.scriptpubkey_address)) {
      return output.scriptpubkey_address;
    }
  }
}

export function inscriptionIdsFromTxOutputs(txOutputs) {
  let inscriptionIds = [];
  for (let output of txOutputs) {
    inscriptionIds = inscriptionIds.concat(output.inscriptions);
  }

  return inscriptionIds;
}

export function getInscriptionsFromInput(input: {
  txid: string;
  witness: string[];
}) {
  if (input.witness.length < 3) return [];

  const inscriptions = [];

  const parsedInscriptions = parseWitness(
    input.witness.map((witness) => Uint8Array.from(Buffer.from(witness, "hex")))
  );

  for (let inscription of parsedInscriptions) {
    inscriptions.push({
      id: `${input.txid}i0`,
      content_type: inscription.tags.contentType,
      content: uint8ArrayToBase64(inscription.body),
    });
  }

  return inscriptions;
}

export function uint8ArrayToBase64(uint8Array: Uint8Array) {
  let binaryString = "";
  const len = uint8Array.byteLength;
  for (let i = 0; i < len; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binaryString);
}

export function parseBrc20Inscription(
  inscription: Inscription
): BRC20Content | null {
  const contentBuffer = Buffer.from(inscription.content, "base64");

  try {
    let parsed = JSON.parse(contentBuffer.toString());
    if (parsed.p === "brc-20") {
      return parsed;
    }
  } catch {}

  return null;
}
