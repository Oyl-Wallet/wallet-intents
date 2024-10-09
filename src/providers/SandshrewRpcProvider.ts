import {
  RpcProvider,
  EsploraTransaction,
  OrdInscription,
  OrdOutput,
  OrdRune,
} from "../types";

export class SandshrewRpcProvider implements RpcProvider {
  baseUrl: string;

  constructor({ url }: { url: string }) {
    this.baseUrl = url;
  }

  async getAddressTxs(address: string): Promise<EsploraTransaction[]> {
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

  async getTxById(txId: string): Promise<EsploraTransaction> {
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

  async getTxOutput(txId: string, voutIndex: number): Promise<OrdOutput> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "ord_output",
        params: [`${txId}:${voutIndex}`],
      }),
    });

    const data = await response.json();
    return data.result;
  }

  async getInscriptionById(inscriptionId: string): Promise<OrdInscription> {
    const [inscriptionResponse, contentResponse] = await Promise.all([
      fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "ord_inscription",
          params: [inscriptionId],
        }),
      }),
      fetch(this.baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "ord_content",
          params: [inscriptionId],
        }),
      }),
    ]);

    const inscriptionData = await inscriptionResponse.json();
    const contentData = await contentResponse.json();

    return {
      ...inscriptionData.result,
      content: contentData.result,
    };
  }

  async getRuneById(runeId: string): Promise<OrdRune> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "ord_rune",
        params: [runeId],
      }),
    });

    const data = await response.json();
    return data.result;
  }
}
