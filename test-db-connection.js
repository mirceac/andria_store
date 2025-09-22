#!/usr/bin/env node

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testConnection() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  console.log('🔄 Testing database connection...');
  console.log('Database URL format:', databaseUrl.replace(/:[^:@]+@/, ':****@'));

  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 30000, // 30 second timeout
    query_timeout: 30000, // 30 second query timeout
    statement_timeout: 45000, // 45 second statement timeout
    ssl: databaseUrl.includes('sslmode=require') || databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Attempting to connect...');
    await client.connect();
    console.log('✅ Connection successful!');

    console.log('🔍 Testing query...');
    const result = await client.query('SELECT NOW() as current_time, version() as db_version');
    console.log('✅ Query successful!');
    console.log('📊 Current time:', result.rows[0].current_time);
    console.log('🗄️  Database version:', result.rows[0].db_version.split(' ').slice(0, 2).join(' '));

    console.log('📋 Testing session table creation...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL
      )
      WITH (OIDS=FALSE);
    `);
    console.log('✅ Session table check successful!');

    console.log('🧹 Cleaning up test...');
    await client.end();
    console.log('✅ Database connection test completed successfully!');

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.errno) {
      console.error('Error number:', error.errno);
    }

    // Provide helpful suggestions based on error type
    if (error.message.includes('timeout')) {
      console.log('\n💡 Timeout suggestions:');
      console.log('   - Check if the database server is running');
      console.log('   - Verify network connectivity');
      console.log('   - Check if firewall is blocking the connection');
      console.log('   - Verify the database URL is correct');
    }
    
    if (error.message.includes('authentication')) {
      console.log('\n💡 Authentication suggestions:');
      console.log('   - Verify username and password in DATABASE_URL');
      console.log('   - Check if the user has proper permissions');
    }

    if (error.message.includes('ENOTFOUND')) {
      console.log('\n💡 DNS/Host suggestions:');
      console.log('   - Check if the hostname is correct');
      console.log('   - Verify DNS resolution');
      console.log('   - Check internet connectivity');
    }

    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Test interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test terminated');
  process.exit(0);
});

testConnection();