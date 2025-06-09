import express from 'express';
import http from 'http';
import cors from 'cors';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { config } from './config';
import { setupWebSocketServer } from './websocket';
import { setupKafkaConsumers } from './kafka/consumers';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { db } from './db';

async function startServer() {
  // Initialize the Express app
  const app = express();
  const httpServer = http.createServer(app);

  // Set up WebSocket server
  setupWebSocketServer(httpServer);

  // Set up Apollo Server (GraphQL)
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  });

  // Start Apollo Server
  await apolloServer.start();

  // Apply middleware
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(apolloServer)
  );

  // Health check endpoint
  app.get('/health', (_, res) => {
    res.status(200).send('OK');
  });

  // Start Kafka consumers
  await setupKafkaConsumers();

  // Start the HTTP server
  await new Promise<void>((resolve) => {
    httpServer.listen({ port: config.port }, resolve);
  });

  console.log(`🚀 Server ready at http://localhost:${config.port}`);
  console.log(`🚀 GraphQL endpoint: http://localhost:${config.port}/graphql`);
  console.log(`🚀 WebSocket endpoint: ws://localhost:${config.port}`);
}

// Initialize database connection and start server
db.initialize()
  .then(() => {
    console.log('Database connection established');
    return startServer();
  })
  .catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  // Close database connections, Kafka consumers, etc.
  await db.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  // Close database connections, Kafka consumers, etc.
  await db.close();
  process.exit(0);
});