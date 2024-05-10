import { http, HttpResponse } from "msw";

type SandshrewRpcProviderRequestBody = {
  method: string;
  params: string[];
};

export const handlers = [
  http.post("http://localhost:3000/v1/regtest", async ({ request }) => {
    const requestBody =
      (await request.json()) as SandshrewRpcProviderRequestBody;

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
];
