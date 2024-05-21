import { http, HttpResponse } from "msw";
import { buildEsploraTxResult } from "./helpers";

type SandshrewRpcProviderRequestBody = {
  method: string;
  params: string[];
};

export const handlers = [
  // http.post("http://localhost:3000/v1/regtest", async ({ request }) => {
  //   const requestBody = (await request
  //     .clone()
  //     .json()) as SandshrewRpcProviderRequestBody;
  //   if (requestBody.method === "esplora_tx") {
  //     const result = buildEsploraTxResult(requestBody.params[0]);
  //     return HttpResponse.json({
  //       result,
  //     });
  //   }
  // }),
  // http.post("http://localhost:3000/v1/regtest", async ({ request }) => {
  //   const requestBody = (await request
  //     .clone()
  //     .json()) as SandshrewRpcProviderRequestBody;
  //   if (requestBody.method === "esplora_address::txs") {
  //     const response = buildAddressTxsResponse(requestBody.params[0]);
  //     return HttpResponse.json(response);
  //   }
  // }),
  // http.post("http://localhost:3000/v1/regtest", async ({ request }) => {
  //   const requestBody = (await request
  //     .clone()
  //     .json()) as SandshrewRpcProviderRequestBody;
  //   if (requestBody.method === "ord_output") {
  //     const response = buildTxOutputResponse(requestBody.params[0]);
  //     return HttpResponse.json(response);
  //   }
  // }),
  // http.post("http://localhost:3000/v1/regtest", async ({ request }) => {
  //   const requestBody = (await request
  //     .clone()
  //     .json()) as SandshrewRpcProviderRequestBody;
  //   if (requestBody.method === "ord_inscription") {
  //     const response = buildInscriptionResponse(requestBody.params[0]);
  //     return HttpResponse.json(response);
  //   }
  // }),
];
