import {
  IntentStatus,
  IntentType,
  NewIntent,
  PartialExistingIntent,
  StorageAdapter,
  WalletIntent,
} from "../types";
import { v4 as uuidv4 } from "uuid";

export class InMemoryStorageAdapter implements StorageAdapter {
  private intents: WalletIntent[] = [];

  async save(intent: NewIntent | PartialExistingIntent): Promise<WalletIntent> {
    if ("id" in intent) {
      const index = this.intents.findIndex((i) => i.id === intent.id);
      if (index === -1) {
        throw new Error(`Intent with ID ${intent.id} not found`);
      }
      const existingIntent = this.intents[index];
      const updatedIntent = {
        ...existingIntent,
        ...intent,
      } as WalletIntent;
      this.intents[index] = updatedIntent;
      return updatedIntent;
    } else {
      const newIntent = {
        timestamp: Date.now(),
        ...intent,
        id: uuidv4(),
      } as WalletIntent;
      this.intents.push(newIntent);
      return newIntent;
    }
  }

  async findAll(): Promise<WalletIntent[]> {
    return this.intents.toSorted((a, b) => b.timestamp - a.timestamp);
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

  async findById(intentId: string): Promise<WalletIntent | undefined> {
    return this.findAll().then((intents) =>
      intents.find(({ id }) => id === intentId)
    );
  }

  async deleteAll(): Promise<void> {
    this.intents = [];
  }
}
