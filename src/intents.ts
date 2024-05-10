// import { getAddressTxs, getTxById } from "./sandhsrew";

// const intents = {};

// type Intent = {
//   address: string;
//   timestamp: number;
//   amount: number;
//   from: string[];
//   txid: string;
// };

// export function captureIntent(address: string, intent: Intent) {
//   if (!intents[address]) {
//     intents[address] = [];
//   }

//   let newIntent: Intent = {
//     address,
//     timestamp: Date.now(),
//     ...intent,
//   };

//   intents[address].push(newIntent);
// }

// export function updateIntent(intent: Intent, updatedIntent: Intent) {
//   const oldIntent = intents[intent.address].find(
//     ({ address }) => address === intent.address
//   );

//   if (oldIntent) {
//     let newIntent = { ...oldIntent, ...updatedIntent };
//   }
// }

// export function getIntents(addresses: string[]) {
//   return addresses.map((address) => intents[address] || []).flat();
// }

// export async function syncWithBlockchain(address: string) {
//   const intentsByAddress = getIntents([address]);

//   for (let intent of intentsByAddress) {
//     const tx = await getTxById(intent.txid);

//     if (tx.status.confirmed) {
//     }
//   }
// }

// export async function captureReceiveIntents(address: string) {
//   try {
//     const txs = await getAddressTxs([address]);

//     txs.forEach((tx) => {
//       const outputsToAddress = tx.vout.filter(
//         (output) => output.scriptpubkey_address === address
//       );
//       const inputsFromAddress = tx.vin.some(
//         (input) => input.prevout.scriptpubkey_address === address
//       );

//       if (outputsToAddress.length > 0 && !inputsFromAddress) {
//         const uniqueSenders = new Set(
//           tx.vin.map((input) => input.prevout.scriptpubkey_address)
//         );

//         outputsToAddress.forEach((output) => {
//           captureIntent(address, {
//             amount: output.value,
//             from: Array.from(uniqueSenders),
//             txid: tx.txid,
//           });
//         });
//       }
//     });
//   } catch (error) {
//     console.error("Failed to fetch transactions:", error);
//   }
// }
