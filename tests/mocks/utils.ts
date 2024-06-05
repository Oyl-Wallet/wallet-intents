import { http, HttpResponse } from "msw";
import { server } from "./server";
import { readFile } from "fs/promises";
import { resolve } from "path";

export const setupMockServer = () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
};

export const mockRpcResponse = (method: string, fixture: string | object) => {
  server.use(
    http.post("http://localhost:3000/v1/regtest", async ({ request }) => {
      const { method: reqMethod } = await request.clone().json();
      if (reqMethod === method) {
        if (typeof fixture === "string" && fixture.endsWith(".json")) {
          const file = await readFile(
            resolve(__dirname, "..", "fixtures", fixture),
            "utf8"
          );
          return HttpResponse.json(JSON.parse(file));
        }
        return HttpResponse.json(fixture);
      }
    })
  );
};
