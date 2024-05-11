import { DataProvider } from "../types";

export class SandshrewRpcProvider implements DataProvider {
  baseUrl: string;

  constructor({ network, projectId }: { network: string; projectId: string }) {
    if (network === "regtest") {
      this.baseUrl = "http://localhost:3000/v1/regtest";
    } else {
      this.baseUrl = `https://${network}.sandshrew.io/v1/${projectId}`;
    }
  }

  async getAddressTxs(address: string) {
    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "esplora_address::txs",
          params: [address],
        }),
      });

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error(error);
    }
  }

  async getTxById(txId: string) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "esplora_tx",
        params: [txId],
      }),
    });

    const data = await response.json();
    return data.result;
  }

  async getTxOutput(txId: string, index: number) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "ord_output",
        params: [`${txId}:${index}`],
      }),
    });

    const data = await response.json();
    return data.result;
  }

  async getInscriptionById(inscriptionId: string) {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "ord_inscription",
        params: [inscriptionId],
      }),
    });

    const data = await response.json();
    return data.result;
  }
}
