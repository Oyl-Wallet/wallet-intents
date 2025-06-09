import { Kafka, Consumer } from 'kafkajs';
import { config, KAFKA_TOPICS } from '../config';
import { TransactionProcessor } from '../services/TransactionProcessor';
import { InscriptionProcessor } from '../services/InscriptionProcessor';
import { RuneProcessor } from '../services/RuneProcessor';
import { IntentProcessor } from '../services/IntentProcessor';
import { db } from '../db';

// Initialize service processors
const transactionProcessor = new TransactionProcessor(db);
const inscriptionProcessor = new InscriptionProcessor(db);
const runeProcessor = new RuneProcessor(db);
const intentProcessor = new IntentProcessor(db);

// Initialize Kafka client
const kafka = new Kafka({
  clientId: config.kafka.clientId,
  brokers: config.kafka.brokers,
});

// Create consumers
const transactionConsumer = kafka.consumer({ groupId: `${config.kafka.groupId}-transactions` });
const inscriptionConsumer = kafka.consumer({ groupId: `${config.kafka.groupId}-inscriptions` });
const runeConsumer = kafka.consumer({ groupId: `${config.kafka.groupId}-runes` });
const intentConsumer = kafka.consumer({ groupId: `${config.kafka.groupId}-intents` });

// Set up transaction consumer
async function setupTransactionConsumer(): Promise<Consumer> {
  await transactionConsumer.connect();
  await transactionConsumer.subscribe({ topic: KAFKA_TOPICS.TRANSACTIONS, fromBeginning: false });
  
  await transactionConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) return;
        
        const transaction = JSON.parse(message.value.toString());
        await transactionProcessor.processTransaction(transaction);
      } catch (error) {
        console.error('Error processing transaction message:', error);
      }
    },
  });
  
  return transactionConsumer;
}

// Set up inscription consumer
async function setupInscriptionConsumer(): Promise<Consumer> {
  await inscriptionConsumer.connect();
  await inscriptionConsumer.subscribe({ topic: KAFKA_TOPICS.INSCRIPTIONS, fromBeginning: false });
  
  await inscriptionConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) return;
        
        const inscription = JSON.parse(message.value.toString());
        await inscriptionProcessor.processInscription(inscription);
      } catch (error) {
        console.error('Error processing inscription message:', error);
      }
    },
  });
  
  return inscriptionConsumer;
}

// Set up rune consumer
async function setupRuneConsumer(): Promise<Consumer> {
  await runeConsumer.connect();
  await runeConsumer.subscribe({ topic: KAFKA_TOPICS.RUNES, fromBeginning: false });
  
  await runeConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) return;
        
        const rune = JSON.parse(message.value.toString());
        await runeProcessor.processRune(rune);
      } catch (error) {
        console.error('Error processing rune message:', error);
      }
    },
  });
  
  return runeConsumer;
}

// Set up intent consumer
async function setupIntentConsumer(): Promise<Consumer> {
  await intentConsumer.connect();
  await intentConsumer.subscribe({ topic: KAFKA_TOPICS.INTENTS, fromBeginning: false });
  
  await intentConsumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        if (!message.value) return;
        
        const intent = JSON.parse(message.value.toString());
        await intentProcessor.processIntent(intent);
      } catch (error) {
        console.error('Error processing intent message:', error);
      }
    },
  });
  
  return intentConsumer;
}

// Set up all consumers
export async function setupKafkaConsumers(): Promise<void> {
  try {
    await Promise.all([
      setupTransactionConsumer(),
      setupInscriptionConsumer(),
      setupRuneConsumer(),
      setupIntentConsumer(),
    ]);
    
    console.log('All Kafka consumers are set up and running');
  } catch (error) {
    console.error('Failed to set up Kafka consumers:', error);
    throw error;
  }
}

// Graceful shutdown of consumers
export async function shutdownKafkaConsumers(): Promise<void> {
  try {
    await Promise.all([
      transactionConsumer.disconnect(),
      inscriptionConsumer.disconnect(),
      runeConsumer.disconnect(),
      intentConsumer.disconnect(),
    ]);
    
    console.log('All Kafka consumers have been disconnected');
  } catch (error) {
    console.error('Error disconnecting Kafka consumers:', error);
    throw error;
  }
}