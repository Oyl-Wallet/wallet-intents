import { http, HttpResponse, passthrough } from "msw";
import { addressTxResponse, txOutputResponse } from "../constants";

type SandshrewRpcProviderRequestBody = {
  method: string;
  params: string[];
};

export const handlers = [
  http.post("http://localhost:3000/v1/regtest", async ({ request }) => {
    const requestBody = (await request
      .clone()
      .json()) as SandshrewRpcProviderRequestBody;

    if (requestBody.method === "esplora_tx") {
      return HttpResponse.json({
        result: {
          status: {
            confirmed: requestBody.params[0] === "confirmedTx",
          },
        },
      });
    }
  }),
  http.post("http://localhost:3000/v1/regtest", async ({ request }) => {
    const requestBody = (await request
      .clone()
      .json()) as SandshrewRpcProviderRequestBody;

    const responseBody = addressTxResponse[requestBody.params[0]];

    if (requestBody.method === "esplora_address::txs") {
      return HttpResponse.json(responseBody);
    }
  }),
  http.post("http://localhost:3000/v1/regtest", async ({ request }) => {
    const requestBody = (await request
      .clone()
      .json()) as SandshrewRpcProviderRequestBody;

    const responseBody = txOutputResponse[requestBody.params[0]];

    if (requestBody.method === "ord_output") {
      return HttpResponse.json(responseBody);
    }
  }),
];
