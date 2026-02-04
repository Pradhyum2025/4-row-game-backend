// EventType represents the type of game event
const EventType = {
  GAME_STARTED: 'GAME_STARTED',
  MOVE_PLAYED: 'MOVE_PLAYED',
  GAME_ENDED: 'GAME_ENDED',
  BOT_GAME_STARTED: 'BOT_GAME_STARTED',
  PLAYER_DISCONNECTED: 'PLAYER_DISCONNECTED'
};

// GameEvent represents a game event to be published to Kafka
class GameEvent {
  constructor(type, gameID, data) {
    this.type = type;
    this.gameID = gameID;
    this.timestamp = new Date();
    this.data = data;
  }
}

// GameStartedData contains data for GAME_STARTED event
class GameStartedData {
  constructor(player1, player2, isBotGame) {
    this.player1 = player1;
    this.player2 = player2;
    this.isBotGame = isBotGame;
  }
}

// MovePlayedData contains data for MOVE_PLAYED event
class MovePlayedData {
  constructor(player, column, row) {
    this.player = player;
    this.column = column;
    this.row = row;
  }
}

// GameEndedData contains data for GAME_ENDED event
class GameEndedData {
  constructor(winner, isDraw, player1, player2) {
    this.winner = winner || '';
    this.isDraw = isDraw;
    this.player1 = player1;
    this.player2 = player2;
  }
}

// PlayerDisconnectedData contains data for PLAYER_DISCONNECTED event
class PlayerDisconnectedData {
  constructor(player, gameID) {
    this.player = player;
    this.gameID = gameID;
  }
}

module.exports = {
  EventType,
  GameEvent,
  GameStartedData,
  MovePlayedData,
  GameEndedData,
  PlayerDisconnectedData
};
