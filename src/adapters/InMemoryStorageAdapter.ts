import {
  IntentStatus,
  IntentType,
  StorageAdapter,
  WalletIntent,
} from "../types";

export class InMemoryStorageAdapter implements StorageAdapter {
  private intents: WalletIntent[] = [];

  async save(intent: WalletIntent): Promise<void> {
    if (intent.id) {
      const newIntents = this.intents.map((existingIntent) => {
        if (existingIntent.id === intent.id) {
          return structuredClone({
            ...existingIntent,
            ...intent,
          });
        }
        return existingIntent;
      });

      this.intents = newIntents;
    } else {
      this.intents.push(
        structuredClone({
          ...intent,
          id: Math.random().toString(36).substring(7),
          timestamp: Date.now(),
        })
      );
    }
  }

  async findAll(): Promise<WalletIntent[]> {
    return structuredClone(this.intents);
  }

  async findByType(type: IntentType): Promise<WalletIntent[]> {
    return structuredClone(
      this.intents.filter((intent) => intent.type === type)
    );
  }

  async findByStatus(status: IntentStatus): Promise<WalletIntent[]> {
    return structuredClone(
      this.intents.filter((intent) => intent.status === status)
    );
  }

  async findByAddresses(addresses: string[]): Promise<WalletIntent[]> {
    return structuredClone(
      this.intents.filter((intent) => addresses.includes(intent.address))
    );
  }
}
