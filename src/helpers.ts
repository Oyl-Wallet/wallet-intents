import { parseWitness } from "micro-ordinals";
import { tryDecodeRunestone, isRunestone } from "@magiceden-oss/runestone-lib";

import {
  ParsedBRC20,
  EsploraTransaction,
  Inscription,
  OrdOutput,
  Rune,
} from "./types";

export function isReceiveTx(tx: EsploraTransaction, addresses: string[]) {
  const addressInOutput = tx.vout.find((output) =>
    addresses.includes(output.scriptpubkey_address)
  );

  const addressInInput = tx.vin.find((input) =>
    addresses.includes(input.prevout.scriptpubkey_address)
  );

  return !!addressInOutput && !addressInInput;
}

export function determineReceiverAddress(
  tx: EsploraTransaction,
  addresses: string[]
) {
  for (const output of tx.vout) {
    if (addresses.includes(output.scriptpubkey_address)) {
      return output.scriptpubkey_address;
    }
  }
}

export function determineReceiverAmount(
  tx: EsploraTransaction,
  addresses: string[]
) {
  let amount = 0;

  for (const output of tx.vout) {
    if (addresses.includes(output.scriptpubkey_address)) {
      amount += output.value;
    }
  }

  return amount;
}

export function inscriptionIdsFromTxOutputs(txOutputs: OrdOutput[]) {
  let inscriptionIds: string[] = [];
  for (let output of txOutputs) {
    inscriptionIds = inscriptionIds.concat(output.inscriptions);
  }

  return inscriptionIds;
}

export function getInscriptionsFromInput(
  input: {
    txid: string;
    witness?: string[];
  },
  parentTxId: string
) {
  if (!input.witness) return [];
  if (input.witness.length < 3) return [];

  const inscriptions: Inscription[] = [];

  try {
    const parsedInscriptions = parseWitness(
      input.witness.map((witness) =>
        Uint8Array.from(Buffer.from(witness, "hex"))
      )
    );

    if (!parsedInscriptions) {
      return inscriptions;
    }

    for (let inscription of parsedInscriptions) {
      inscriptions.push({
        id: `${parentTxId}i0`,
        content_type: inscription.tags.contentType!!,
        content: uint8ArrayToBase64(inscription.body),
      });
    }
  } catch (error) {
    console.error("Error parsing inscriptions from input", error);
  }

  return inscriptions;
}

export function getRuneFromOutputs(
  vout: EsploraTransaction["vout"]
): Rune | null {
  const asBtcoinCoreTxVout = vout.map((output) => ({
    scriptPubKey: {
      hex: output.scriptpubkey,
    },
  }));

  const artifact = tryDecodeRunestone({ vout: asBtcoinCoreTxVout });

  if (artifact && isRunestone(artifact)) {
    return artifact;
  }
  return null;
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
): ParsedBRC20 | void {
  const contentBuffer = Buffer.from(inscription.content, "base64");
  try {
    let parsed = JSON.parse(contentBuffer.toString());
    if (parsed.p === "brc-20") {
      return parsed;
    }
  } catch {}
}
