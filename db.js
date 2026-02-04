const { Pool } = require('pg');

function parseConnectionString(connStr) {
  // Support both postgres:// and postgresql:// protocols
  const match = connStr.match(/postgres(ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
  if (!match) {
    throw new Error('Invalid connection string format');
  }
  return {
    user: match[2],
    password: match[3],
    host: match[4],
    port: match[5],
    database: match[6],
    params: connStr.includes('?') ? connStr.split('?')[1] : ''
  };
}

function buildConnectionString(parsed, database) {
  const params = parsed.params ? `?${parsed.params}` : '';
  return `postgres://${parsed.user}:${parsed.password}@${parsed.host}:${parsed.port}/${database}${params}`;
}

async function connectDB(connectionString) {
  const parsed = parseConnectionString(connectionString);
  const dbName = parsed.database;
  
  // Determine SSL configuration from connection string or environment
  let sslConfig = false;
  if (parsed.params && parsed.params.includes('sslmode=require')) {
    sslConfig = { rejectUnauthorized: false };
  } else if (parsed.params && parsed.params.includes('sslmode=disable')) {
    sslConfig = false;
  } else if (process.env.DATABASE_URL && !parsed.params.includes('sslmode=disable')) {
    // Cloud providers (Vercel, etc.) typically require SSL
    sslConfig = { rejectUnauthorized: false };
  }
  
  const poolConfig = {
    connectionString,
    ssl: sslConfig
  };
  
  let pool = new Pool(poolConfig);
  
  try {
    await pool.query('SELECT 1');
    console.log(`Connected to PostgreSQL database: ${dbName}`);
    return pool;
  } catch (err) {
    if (err.message.includes('does not exist')) {
      console.log(`Database "${dbName}" does not exist. Creating it...`);
      
      const adminConnStr = buildConnectionString(parsed, 'postgres');
      const adminPoolConfig = {
        connectionString: adminConnStr,
        ssl: sslConfig
      };
      const adminPool = new Pool(adminPoolConfig);
      
      try {
        await adminPool.query('SELECT 1');
        const client = await adminPool.connect();
        try {
          const result = await client.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [dbName]
          );
          
          if (result.rows.length === 0) {
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`Database "${dbName}" created successfully`);
          }
        } finally {
          client.release();
        }
        await adminPool.end();
        
        pool = new Pool(poolConfig);
        await pool.query('SELECT 1');
        console.log(`Connected to PostgreSQL database: ${dbName}`);
        return pool;
      } catch (createErr) {
        await adminPool.end();
        throw new Error(`Failed to create database: ${createErr.message}`);
      }
    } else {
      throw new Error(`Failed to connect to database: ${err.message}`);
    }
  }
}

async function initSchema(pool) {
  const migrationSQL = `
    CREATE TABLE IF NOT EXISTS games (
      id UUID PRIMARY KEY,
      player1_username VARCHAR(255) NOT NULL,
      player2_username VARCHAR(255),
      winner VARCHAR(255),
      status VARCHAR(50) NOT NULL,
      started_at TIMESTAMP NOT NULL,
      ended_at TIMESTAMP,
      board_state JSONB,
      is_bot_game BOOLEAN DEFAULT FALSE
    );
    
    CREATE TABLE IF NOT EXISTS players (
      username VARCHAR(255) PRIMARY KEY,
      wins INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
    CREATE INDEX IF NOT EXISTS idx_games_started_at ON games(started_at);
    CREATE INDEX IF NOT EXISTS idx_players_wins ON players(wins DESC);
  `;
  
  await pool.query(migrationSQL);
  console.log('Database schema initialized');
}

async function getLeaderboard(pool, limit) {
  const query = `
    SELECT username, wins
    FROM players
    ORDER BY wins DESC
    LIMIT $1
  `;
  
  const result = await pool.query(query, [limit]);
  return result.rows.map(row => ({
    username: row.username,
    wins: parseInt(row.wins)
  }));
}

async function incrementPlayerWins(pool, username) {
  const query = `
    INSERT INTO players (username, wins)
    VALUES ($1, 1)
    ON CONFLICT (username) DO UPDATE SET
      wins = players.wins + 1
  `;
  
  await pool.query(query, [username]);
}

module.exports = {
  connectDB,
  initSchema,
  getLeaderboard,
  incrementPlayerWins
};
