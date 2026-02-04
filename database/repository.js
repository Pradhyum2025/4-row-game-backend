const { GameStatus, LeaderboardEntry, PlayerStats } = require('../models/game');

// Repository handles database operations
class Repository {
  constructor(db) {
    this.db = db;
  }

  // SaveGame saves a completed game to the database
  async saveGame(game) {
    const client = await this.db.getConnection().connect();
    
    try {
      await client.query('BEGIN');
      
      const boardJSON = JSON.stringify(game.boardState);
      const endedAt = game.endedAt || null;
      
      const query = `
        INSERT INTO games (id, player1_username, player2_username, winner, status, started_at, ended_at, board_state, is_bot_game)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          winner = EXCLUDED.winner,
          status = EXCLUDED.status,
          ended_at = EXCLUDED.ended_at,
          board_state = EXCLUDED.board_state
      `;
      
      await client.query(query, [
        game.gameID,
        game.player1,
        game.player2,
        game.winner,
        game.status,
        game.startedAt,
        endedAt,
        boardJSON,
        false
      ]);
      
      // Update player wins if there's a winner
      if (game.winner && !game.isDraw) {
        await this.incrementPlayerWinsWithClient(client, game.winner);
      }
      
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // IncrementPlayerWinsWithClient increments the win count for a player (within transaction)
  async incrementPlayerWinsWithClient(client, username) {
    const query = `
      INSERT INTO players (username, wins)
      VALUES ($1, 1)
      ON CONFLICT (username) DO UPDATE SET
        wins = players.wins + 1
    `;
    
    await client.query(query, [username]);
  }

  // IncrementPlayerWins increments the win count for a player (standalone)
  async incrementPlayerWins(username) {
    const query = `
      INSERT INTO players (username, wins)
      VALUES ($1, 1)
      ON CONFLICT (username) DO UPDATE SET
        wins = players.wins + 1
    `;
    
    await this.db.getConnection().query(query, [username]);
  }

  // GetLeaderboard returns the top players sorted by wins
  async getLeaderboard(limit) {
    const query = `
      SELECT username, wins
      FROM players
      ORDER BY wins DESC
      LIMIT $1
    `;
    
    const result = await this.db.getConnection().query(query, [limit]);
    return result.rows.map(row => new LeaderboardEntry(row.username, parseInt(row.wins)));
  }

  // GetPlayerStats returns statistics for a specific player
  async getPlayerStats(username) {
    const query = `
      SELECT wins
      FROM players
      WHERE username = $1
    `;
    
    const result = await this.db.getConnection().query(query, [username]);
    
    if (result.rows.length === 0) {
      return new PlayerStats(username, 0);
    }
    
    return new PlayerStats(username, parseInt(result.rows[0].wins));
  }

  // InitSchema runs database migrations
  async initSchema() {
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
    
    await this.db.getConnection().query(migrationSQL);
  }
}

// NewRepository creates a new repository
function newRepository(db) {
  return new Repository(db);
}

module.exports = {
  Repository,
  newRepository
};
