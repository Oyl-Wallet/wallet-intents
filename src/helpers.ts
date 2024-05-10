export function isReceiveTx(tx, addresses) {
  const outputsToAddress = tx.vout.filter((output) =>
    addresses.includes(output.scriptpubkey_address)
  );

  const inputsFromAddress = tx.vin.some((input) =>
    addresses.includes(input.prevout.scriptpubkey_address)
  );

  return outputsToAddress.length <= 0 || inputsFromAddress;
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
