import { Server as HttpServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { typeDefs } from '../graphql/schema';
import { resolvers } from '../graphql/resolvers';

// Create an executable schema
const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

// Set up WebSocket server for GraphQL subscriptions
export function setupWebSocketServer(httpServer: HttpServer): void {
  // Create WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  // Use the WebSocket server for GraphQL subscriptions
  const serverCleanup = useServer(
    {
      schema,
      onConnect: (ctx: any) => {
        console.log('Client connected to WebSocket');
        return true;
      },
      onDisconnect: (ctx: any) => {
        console.log('Client disconnected from WebSocket');
      },
    },
    wsServer
  );

  // Cleanup function for graceful shutdown
  const originalClose = httpServer.close.bind(httpServer);
  httpServer.close = (callback?: (err?: Error) => void) => {
    serverCleanup.dispose();
    return originalClose(callback);
  };
}