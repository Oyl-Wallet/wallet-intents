import pgPromise from 'pg-promise';
import { config } from '../config';

// Initialize pg-promise
const pgp = pgPromise({
  // Initialization options
  capSQL: true, // capitalize SQL queries
});

// Database connection details
const connectionConfig = {
  host: config.database.host,
  port: config.database.port,
  database: config.database.database,
  user: config.database.user,
  password: config.database.password,
  max: 30, // Maximum number of connections in the pool
};

// Create the database instance
const pgDb = pgp(connectionConfig);

// Database interface
export class Database {
  private db: pgPromise.IDatabase<any>;
  private initialized: boolean = false;

  constructor() {
    this.db = pgDb;
  }

  // Initialize database connection
  async initialize(): Promise<void> {
    try {
      // Test the connection
      await this.db.connect();
      this.initialized = true;
      console.log('Database connection established successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  // Close database connection
  async close(): Promise<void> {
    try {
      await pgp.end();
      console.log('Database connection closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    }
  }

  // Get the database instance
  get instance(): pgPromise.IDatabase<any> {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  // Transaction helper
  async tx<T>(callback: (t: pgPromise.ITask<any>) => Promise<T>): Promise<T> {
    return this.db.tx(callback);
  }

  // Query helper methods
  async query<T>(query: string, values?: any): Promise<T[]> {
    return this.db.any<T>(query, values);
  }

  async queryOne<T>(query: string, values?: any): Promise<T | null> {
    return this.db.oneOrNone<T>(query, values);
  }

  async execute(query: string, values?: any): Promise<null> {
    return this.db.none(query, values);
  }
}

// Export a singleton instance
export const db = new Database();