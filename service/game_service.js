const { v4: uuidv4 } = require('uuid');
const { newBoard, PLAYER1, PLAYER2 } = require('../game/board');
const { checkWin, checkDraw, getOpponent } = require('../game/engine');
const { makeMove } = require('../game/validator');
const { newBotAI } = require('../bot/ai');
const { Game, Move, GameResult, GameStatus, Player, Errors } = require('../models/game');
const { EventType, GameEvent, GameStartedData, MovePlayedData, GameEndedData } = require('../events/events');

// GameService manages active games
class GameService {
  constructor(kafkaProducer) {
    this.games = new Map(); // gameID -> game
    this.kafka = kafkaProducer;
    this.botAI = null;
  }

  // CreateGame creates a new game
  createGame(player1Username, player2Username, isBotGame) {
    const gameID = uuidv4();
    
    const newGame = new Game();
    newGame.id = gameID;
    newGame.player1 = new Player(player1Username, PLAYER1);
    // If bot game and waiting, set status to WAITING, otherwise ACTIVE
    newGame.status = (isBotGame && !player2Username) ? GameStatus.WAITING : GameStatus.ACTIVE;
    newGame.board = newBoard();
    newGame.currentTurn = PLAYER1;
    newGame.startedAt = new Date();
    newGame.lastMoveAt = new Date();
    newGame.isBotGame = isBotGame;
    
    if (isBotGame) {
      newGame.player2 = new Player('Bot', PLAYER2);
      this.botAI = newBotAI(PLAYER2);
    } else {
      newGame.player2 = new Player(player2Username, PLAYER2);
    }
    
    this.games.set(gameID, newGame);
    
    // Publish event
    const event = new GameEvent(
      EventType.GAME_STARTED,
      gameID,
      new GameStartedData(player1Username, player2Username || 'Bot', isBotGame)
    );
    
    // Kafka is optional - publish event if available
    if (this.kafka) {
      this.kafka.publishEvent(event).catch(() => {
        // Silently fail - Kafka is optional
      });
    }
    
    return newGame;
  }

  // GetGame retrieves a game by ID
  getGame(gameID) {
    return this.games.get(gameID);
  }

  // MakeMove processes a player move
  async makeMove(gameID, player, column) {
    const game = this.games.get(gameID);
    if (!game) {
      throw Errors.GameNotFound;
    }
    
    if (game.status !== GameStatus.ACTIVE) {
      throw Errors.GameNotActive;
    }
    
    if (game.currentTurn !== player) {
      throw Errors.NotYourTurn;
    }
    
    const { validateMove } = require('../game/validator');
    if (!validateMove(game.board, column, player)) {
      throw Errors.InvalidMove;
    }
    
    const row = makeMove(game.board, column, player);
    if (row === -1) {
      throw Errors.InvalidMove;
    }
    
    const move = new Move(player, column, row, gameID);
    
    game.lastMoveAt = new Date();
    
    // Check for win
    if (checkWin(game.board, column, row, player)) {
      if (player === PLAYER1) {
        game.winner = game.player1;
      } else {
        game.winner = game.player2;
      }
      game.status = GameStatus.FINISHED;
      game.endedAt = new Date();
    } else if (checkDraw(game.board)) {
      game.isDraw = true;
      game.status = GameStatus.FINISHED;
      game.endedAt = new Date();
    } else {
      game.currentTurn = getOpponent(player);
    }
    
    // Publish move event
    const event = new GameEvent(
      EventType.MOVE_PLAYED,
      gameID,
      new MovePlayedData(player, column, row)
    );
    
    // Kafka is optional - publish event if available
    if (this.kafka) {
      this.kafka.publishEvent(event).catch(() => {
        // Silently fail - Kafka is optional
      });
    }
    
    // If game ended, publish game ended event
    if (game.status === GameStatus.FINISHED) {
      const winner = game.winner ? game.winner.username : '';
      const endedEvent = new GameEvent(
        EventType.GAME_ENDED,
        gameID,
        new GameEndedData(winner, game.isDraw, game.player1.username, game.player2.username)
      );
      
      // Kafka is optional - publish event if available
      if (this.kafka) {
        this.kafka.publishEvent(endedEvent).catch(() => {
          // Silently fail - Kafka is optional
        });
      }
    }
    
    return move;
  }

  // GetBotMove gets the bot's move
  async getBotMove(gameID) {
    const game = this.getGame(gameID);
    if (!game) {
      throw Errors.GameNotFound;
    }
    
    if (!game.isBotGame) {
      throw Errors.NotBotGame;
    }
    
    if (game.currentTurn !== PLAYER2) {
      throw Errors.NotYourTurn;
    }
    
    if (!this.botAI) {
      this.botAI = newBotAI(PLAYER2);
    }
    
    const column = this.botAI.getBestMove(game.board);
    if (column === -1) {
      throw Errors.InvalidMove;
    }
    
    return await this.makeMove(gameID, PLAYER2, column);
  }

  // CleanupGame removes a finished game from memory
  cleanupGame(gameID) {
    this.games.delete(gameID);
  }
}

// NewGameService creates a new game service
function newGameService(kafkaProducer) {
  return new GameService(kafkaProducer);
}

module.exports = {
  GameService,
  newGameService
};
