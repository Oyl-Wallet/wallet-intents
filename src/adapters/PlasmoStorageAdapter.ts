import { Intent, StorageAdapter } from "../types";
import { Storage } from "@plasmohq/storage";

export class PlasmoStorageAdapter implements StorageAdapter {
  private storage: Storage;
  private key: string;

  constructor(key: string) {
    this.key = key;
    this.storage = new Storage({
      area: "local",
    });
  }

  async save(intent: Intent): Promise<void> {
    const intents = await this.getAllIntents();

    if (intent.id) {
      const newIntents = intents.map((existingIntent) => {
        if (existingIntent.id === intent.id) {
          return {
            ...existingIntent,
            ...intent,
          };
        }
        return existingIntent;
      });

      return this.storage.set(this.key, newIntents);
    } else {
      intents.push(
        structuredClone({
          ...intent,
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
        })
      );

      return this.storage.set(this.key, intents);
    }
  }

  async getAllIntents(): Promise<Intent[]> {
    const intents = await this.storage.get<Intent[]>(this.key);
    return intents || [];
  }

  async getIntentsByAddresses(addresses: string[]): Promise<Intent[]> {
    const intents = await this.getAllIntents();
    return intents.filter((intent) => addresses.includes(intent.address));
  }
}
