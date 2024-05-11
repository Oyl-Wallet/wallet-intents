export const addresses = {
  RECEIVE_BTC_CONFIRMED: "1PPNuG2YxgVmXVR4soUgKrJ6pFbxJBmmz6",
  INSCRIPTIONS_ON_OUTPUT: "1Etk4BEkZdjecBkZhLAms4GeqWKTEUpek6",
};

export const transactions = {
  RECEIVE_BTC_CONFIRMED:
    "3b8a773dba7a4cfd3cc00c132dac0adb83cbf46a8d8467561b6bea0a57340b24",
};

export const addressTxResponse = {
  [addresses.RECEIVE_BTC_CONFIRMED]: {
    result: {
      id: transactions.RECEIVE_BTC_CONFIRMED,
      vin: [],
      vout: [
        {
          scriptpubkey_address: addresses.RECEIVE_BTC_CONFIRMED,
          value: 10000,
        },
      ],
      status: {
        confirmed: true,
      },
    },
  },
};

export const txOutputResponse = {
  [`${transactions.RECEIVE_BTC_CONFIRMED}:0`]: {
    result: {
      indexed: true,
      inscriptions: [],
      runes: [],
    },
  },
};
