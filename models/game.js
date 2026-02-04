// GameStatus represents the current status of a game
const GameStatus = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  FINISHED: 'finished',
  ABANDONED: 'abandoned'
};

// Player represents a player in the game
class Player {
  constructor(username, color) {
    this.username = username;
    this.color = color; // 1 for player 1, 2 for player 2
  }
}

// Game represents a game instance
class Game {
  constructor() {
    this.id = '';
    this.player1 = null;
    this.player2 = null;
    this.currentTurn = 1; // 1 or 2
    this.board = []; // 7 columns x 6 rows, 0 = empty, 1 = player1, 2 = player2
    this.status = GameStatus.ACTIVE;
    this.winner = null;
    this.isDraw = false;
    this.startedAt = new Date();
    this.endedAt = null;
    this.lastMoveAt = new Date();
    this.isBotGame = false;
  }
}

// Move represents a player move
class Move {
  constructor(player, column, row, gameID) {
    this.player = player; // 1 or 2
    this.column = column; // 0-6
    this.row = row; // 0-5 (calculated after move)
    this.gameID = gameID;
  }
}

// GameResult represents the result of a completed game
class GameResult {
  constructor() {
    this.gameID = '';
    this.player1 = '';
    this.player2 = '';
    this.winner = '';
    this.isDraw = false;
    this.status = GameStatus.FINISHED;
    this.startedAt = new Date();
    this.endedAt = new Date();
    this.boardState = [];
  }
}

// LeaderboardEntry represents a leaderboard entry
class LeaderboardEntry {
  constructor(username, wins) {
    this.username = username;
    this.wins = wins;
  }
}

// PlayerStats represents player statistics
class PlayerStats {
  constructor(username, wins) {
    this.username = username;
    this.wins = wins;
  }
}

// Custom errors
class GameError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GameError';
  }
}

const Errors = {
  GameNotFound: new GameError('game not found'),
  GameNotActive: new GameError('game is not active'),
  NotYourTurn: new GameError('not your turn'),
  InvalidMove: new GameError('invalid move'),
  NotBotGame: new GameError('not a bot game')
};

module.exports = {
  GameStatus,
  Player,
  Game,
  Move,
  GameResult,
  LeaderboardEntry,
  PlayerStats,
  Errors
};
