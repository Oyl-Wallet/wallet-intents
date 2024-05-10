import { Intent, StorageAdapter } from "../types";

export class InMemoryStorageAdapter implements StorageAdapter {
  private intents: Intent[] = [];

  async save(intent: Intent): Promise<void> {
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

  async getAllIntents(): Promise<Intent[]> {
    return structuredClone(this.intents);
  }

  async getIntentsByAddresses(addresses: string[]): Promise<Intent[]> {
    const intents = this.intents.filter((intent) =>
      addresses.includes(intent.address)
    );
    return structuredClone(intents);
  }
}
