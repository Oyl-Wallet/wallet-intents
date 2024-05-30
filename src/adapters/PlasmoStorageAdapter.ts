import {
  WalletIntent,
  IntentStatus,
  IntentType,
  StorageAdapter,
} from "../types";
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

  async save(intent: WalletIntent): Promise<void> {
    const intents = await this.findAll();

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

  async findAll(): Promise<WalletIntent[]> {
    return this.storage
      .get<WalletIntent[]>(this.key)
      .then(
        (intents) => intents.sort((a, b) => b.timestamp - a.timestamp) || []
      );
  }

  async findByType(type: IntentType): Promise<WalletIntent[]> {
    return this.findAll().then((intents) =>
      intents.filter((intent) => intent.type === type)
    );
  }

  async findByStatus(status: IntentStatus): Promise<WalletIntent[]> {
    return this.findAll().then((intents) =>
      intents.filter((intent) => intent.status === status)
    );
  }

  async findByAddresses(addresses: string[]): Promise<WalletIntent[]> {
    return this.findAll().then((intents) =>
      intents.filter((intent) => addresses.includes(intent.address))
    );
  }

  async findById(intentId: string): Promise<WalletIntent> {
    return this.findAll().then((intents) =>
      intents.find((intent) => intent.id === intentId)
    );
  }
}
