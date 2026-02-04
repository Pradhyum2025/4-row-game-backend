const { Pool } = require('pg');

// DB wraps the database connection
class DB {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString: connectionString,
    });
  }

  // GetConnection returns the underlying database connection pool
  getConnection() {
    return this.pool;
  }

  // Close closes the database connection pool
  async close() {
    await this.pool.end();
  }

  // Ping checks if database is connected
  async ping() {
    const client = await this.pool.connect();
    try {
      await client.query('SELECT 1');
      return true;
    } finally {
      client.release();
    }
  }
}

// Parse PostgreSQL connection string
function parseConnectionString(connStr) {
  // Format: postgres://user:pass@host:port/db?params
  const match = connStr.match(/postgres:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!match) {
    throw new Error('Invalid connection string format');
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5],
    params: connStr.includes('?') ? connStr.split('?')[1] : ''
  };
}

// Build connection string
function buildConnectionString(parsed, database) {
  const params = parsed.params ? `?${parsed.params}` : '';
  return `postgres://${parsed.user}:${parsed.password}@${parsed.host}:${parsed.port}/${database}${params}`;
}

// NewDB creates a new database connection
// If the database doesn't exist, it will be created automatically
async function newDB(connectionString) {
  const parsed = parseConnectionString(connectionString);
  const dbName = parsed.database;
  
  // First, try to connect to the target database
  let db = new DB(connectionString);
  try {
    await db.ping();
    console.log(`Connected to PostgreSQL database: ${dbName}`);
    return db;
  } catch (err) {
    // If database doesn't exist, create it
    if (err.message.includes('does not exist')) {
      console.log(`Database "${dbName}" does not exist. Creating it...`);
      
      // Connect to default 'postgres' database to create the new database
      const adminConnStr = buildConnectionString(parsed, 'postgres');
      const adminDb = new DB(adminConnStr);
      try {
        await adminDb.ping();
        const client = await adminDb.getConnection().connect();
        try {
          // Check if database exists
          const result = await client.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [dbName]
          );
          
          if (result.rows.length === 0) {
            // Create database
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database "${dbName}" created successfully`);
          }
        } finally {
          client.release();
        }
        await adminDb.close();
        
        // Now connect to the newly created database
        db = new DB(connectionString);
        await db.ping();
        console.log(`Connected to PostgreSQL database: ${dbName}`);
        return db;
      } catch (createErr) {
        await adminDb.close();
        throw new Error(`Failed to create database: ${createErr.message}`);
      }
    } else {
      throw new Error(`Failed to connect to database: ${err.message}`);
    }
  }
}

module.exports = {
  DB,
  newDB
};
