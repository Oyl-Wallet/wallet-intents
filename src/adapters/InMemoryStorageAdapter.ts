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
