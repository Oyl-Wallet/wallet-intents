import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface Config {
  port: number;
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  kafka: {
    brokers: string[];
    clientId: string;
    groupId: string;
  };
  sandshrew: {
    url: string;
  };
}

export const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'wallet_intents',
    password: process.env.DB_PASSWORD || 'wallet_intents_password',
    database: process.env.DB_NAME || 'wallet_intents',
  },
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
    clientId: process.env.KAFKA_CLIENT_ID || 'wallet-intents-backend',
    groupId: process.env.KAFKA_GROUP_ID || 'wallet-intents-group',
  },
  sandshrew: {
    url: process.env.SANDSHREW_URL || 'https://mainnet.sandshrew.io/v2/default',
  },
};

// Define Kafka topics
export const KAFKA_TOPICS = {
  TRANSACTIONS: 'wallet-intents-transactions',
  INSCRIPTIONS: 'wallet-intents-inscriptions',
  RUNES: 'wallet-intents-runes',
  INTENTS: 'wallet-intents-intents',
};