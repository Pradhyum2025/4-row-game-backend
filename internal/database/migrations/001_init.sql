-- Create games table
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

-- Create players table for leaderboard
CREATE TABLE IF NOT EXISTS players (
    username VARCHAR(255) PRIMARY KEY,
    wins INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index on games for faster queries
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_started_at ON games(started_at);
CREATE INDEX IF NOT EXISTS idx_players_wins ON players(wins DESC);

