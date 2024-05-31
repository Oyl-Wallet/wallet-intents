import {
  WalletIntent,
  IntentStatus,
  IntentType,
  StorageAdapter,
  NewIntent,
  PartialExistingIntent,
} from "../types";
import { Storage } from "@plasmohq/storage";
import { v4 as uuidv4 } from "uuid";

export class PlasmoStorageAdapter implements StorageAdapter {
  private storage: Storage;
  private key: string;

  constructor(key: string) {
    this.key = key;
    this.storage = new Storage({
      area: "local",
    });
  }

  async save(intent: NewIntent | PartialExistingIntent): Promise<WalletIntent> {
    const intents = await this.findAll();
    let updatedIntent: WalletIntent;

    if ("id" in intent) {
      const newIntents = intents.map((existingIntent) => {
        if (existingIntent.id === intent.id) {
          updatedIntent = {
            ...existingIntent,
            ...intent,
          } as WalletIntent;
          return updatedIntent;
        }
        return existingIntent;
      });

      await this.storage.set(this.key, newIntents);
    } else {
      updatedIntent = {
        ...intent,
        id: uuidv4(),
        timestamp: Date.now(),
      } as WalletIntent;

      intents.push(updatedIntent);
      await this.storage.set(this.key, intents);
    }

    return updatedIntent;
  }

  async findAll(): Promise<WalletIntent[]> {
    return this.storage
      .get<WalletIntent[]>(this.key)
      .then((intents) =>
        (intents || []).sort((a, b) => b.timestamp - a.timestamp)
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

  async findByStatusAndAddresses(
    status: IntentStatus,
    addresses: string[]
  ): Promise<WalletIntent[]> {
    return this.findAll().then((intents) =>
      intents.filter(
        (intent) =>
          intent.status === status && addresses.includes(intent.address)
      )
    );
  }

  async findById(intentId: string): Promise<WalletIntent> {
    return this.findAll().then((intents) =>
      intents.find((intent) => intent.id === intentId)
    );
  }
}
