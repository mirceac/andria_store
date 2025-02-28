import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import { config } from '../config';

// Add logging to help diagnose connection issues
console.log("Attempting to connect to database with URL format:", 
  config.databaseUrl.replace(/:[^:@]+@/, ':****@')); // Hide password in logs

// Declare exports before initialization
let pool: pg.Pool;
let db: ReturnType<typeof drizzle<typeof schema>>;

try {
  // Initialize the connection pool
  pool = new pg.Pool({ 
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: 5000, // 5 second timeout
    max: 10, // Maximum number of clients in the pool
    idleTimeoutMillis: 120000, // Close idle connections after 2 minutes
    ssl: false // Explicitly disable SSL for local connections
  });

  // Test the connection
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });

  // Initialize Drizzle with query capabilities
  db = drizzle(pool, { schema: {
    ...schema,
    query: {
      users: schema.users,
      products: schema.products,
      orders: schema.orders,
      orderItems: schema.orderItems
    }
  }});

  console.log("Database connection established successfully");
} catch (error) {
  console.error("Failed to initialize database connection:", error);
  throw error;
}

// Export after initialization
export { pool, db };