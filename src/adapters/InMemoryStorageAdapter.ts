import {
  IntentStatus,
  IntentType,
  StorageAdapter,
  WalletIntent,
} from "../types";
import { v4 as uuidv4 } from "uuid";

export class InMemoryStorageAdapter implements StorageAdapter {
  private intents: WalletIntent[] = [];

  async save(intent: WalletIntent): Promise<WalletIntent> {
    let savedIntent: WalletIntent;

    if (intent.id) {
      this.intents = this.intents.map((existingIntent) => {
        if (existingIntent.id === intent.id) {
          savedIntent = structuredClone({
            ...existingIntent,
            ...intent,
          });
          return savedIntent;
        }
        return existingIntent;
      });
    } else {
      savedIntent = structuredClone({
        ...intent,
        id: uuidv4(),
        timestamp: Date.now(),
      });
      this.intents.push(savedIntent);
    }

    return savedIntent;
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

  async findById(intentId: string): Promise<WalletIntent> {
    return this.findAll().then((intents) =>
      intents.find(({ id }) => id === intentId)
    );
  }
}
