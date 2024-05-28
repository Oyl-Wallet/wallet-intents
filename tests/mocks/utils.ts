import { http, HttpResponse } from "msw";
import { server } from "./server";

export const setupMockServer = () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};

export const mockRpcResponse = (method: string, fixture: any | Function) => {
  server.use(
    http.post("http://localhost:3000/v1/regtest", async ({ request }) => {
      const { method: reqMethod, params } = await request.clone().json();
      if (reqMethod === method) {
        if (typeof fixture === "function") {
          return HttpResponse.json(fixture(params));
        }
        return HttpResponse.json(fixture);
      }
    })
  );
};
