const { GameStatus, Errors } = require('../models/game');

// Handler handles WebSocket messages
class Handler {
  constructor(hub, gameService, matchmaking) {
    this.hub = hub;
    this.gameService = gameService;
    this.matchmaking = matchmaking;
    this.reconnectGames = new Map(); // gameID -> game for reconnection
  }

  // SetHub sets the hub for the handler
  setHub(hub) {
    this.hub = hub;
  }

  // HandleMessage processes incoming WebSocket messages
  handleMessage(client, message) {
    try {
      const wsMsg = JSON.parse(message.toString());
      
      switch (wsMsg.type) {
        case 'JOIN_GAME':
          this.handleJoinGame(client, wsMsg.payload);
          break;
        case 'MOVE':
          this.handleMove(client, wsMsg.payload);
          break;
        case 'RECONNECT':
          this.handleReconnect(client, wsMsg.payload);
          break;
        default:
          this.sendError(client, 'Unknown message type');
      }
    } catch (err) {
      this.sendError(client, 'Invalid message format');
    }
  }

  handleJoinGame(client, payload) {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      
      if (!data || !data.username) {
        this.sendError(client, 'Invalid join game data');
        return;
      }
      
      client.username = data.username;
      
      const result = this.matchmaking.joinQueue(data.username);
      if (!result || !result.game) {
        this.sendError(client, 'Failed to join game queue');
        return;
      }
      
      const { game, started } = result;
      
      client.gameID = game.id;
      
      if (started) {
        this.sendGameStarted(client, game);
      } else {
        this.sendWaiting(client);
      }
    } catch (err) {
      console.error('Error in handleJoinGame:', err);
      this.sendError(client, 'Failed to join game queue');
    }
  }

  async handleMove(client, payload) {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      
      if (!data || typeof data.column !== 'number') {
        this.sendError(client, 'Invalid move data');
        return;
      }
      
      const game = this.gameService.getGame(client.gameID);
      if (!game) {
        this.sendError(client, 'Game not found');
        return;
      }
      
      let player = game.player1.color;
      if (client.username === game.player2.username) {
        player = game.player2.color;
      }
      
      const move = await this.gameService.makeMove(client.gameID, player, data.column);
      if (!move) {
        this.sendError(client, 'Invalid move');
        return;
      }
      
      this.broadcastGameState(client.gameID);
      
      // If bot game and bot's turn, make bot move
      const updatedGame = this.gameService.getGame(client.gameID);
      if (updatedGame && updatedGame.isBotGame && 
          updatedGame.currentTurn === updatedGame.player2.color && 
          updatedGame.status === GameStatus.ACTIVE) {
        // Small delay for UX
        setTimeout(async () => {
          try {
            await this.gameService.getBotMove(client.gameID);
            this.broadcastGameState(client.gameID);
          } catch (err) {
            console.error('Error making bot move:', err);
          }
        }, 500);
      }
    } catch (err) {
      console.error('Error in handleMove:', err);
      this.sendError(client, err.message || 'Invalid move');
    }
  }

  handleReconnect(client, payload) {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      
      if (!data || !data.username) {
        this.sendError(client, 'Invalid reconnect data');
        return;
      }
      
      client.username = data.username;
      
      // Try to find active game
      if (data.game_id) {
        const game = this.gameService.getGame(data.game_id);
        if (game && (game.player1.username === data.username || game.player2.username === data.username)) {
          client.gameID = game.id;
          this.sendGameState(client, game);
          return;
        }
      }
      
      // Search by username in reconnectGames
      for (const [gameID, game] of this.reconnectGames) {
        if ((game.player1.username === data.username || game.player2.username === data.username) &&
            game.status === GameStatus.ACTIVE) {
          client.gameID = gameID;
          this.sendGameState(client, game);
          return;
        }
      }
      
      this.sendError(client, 'No active game found');
    } catch (err) {
      console.error('Error in handleReconnect:', err);
      this.sendError(client, 'Failed to reconnect');
    }
  }

  broadcastGameState(gameID) {
    if (!this.hub) {
      return;
    }
    
    const game = this.gameService.getGame(gameID);
    if (!game) {
      return;
    }
    
    const state = this.buildGameState(game);
    const stateJSON = JSON.stringify(state);
    this.hub.broadcastToGame(gameID, stateJSON);
  }

  sendGameState(client, game) {
    if (!this.hub) {
      return;
    }
    
    const state = this.buildGameState(game);
    const stateJSON = JSON.stringify(state);
    this.hub.sendToClient(client.username, stateJSON);
  }

  buildGameState(game) {
    const payload = {
      game_id: game.id,
      board: game.board,
      current_turn: game.currentTurn,
      status: game.status,
      winner: this.getWinnerUsername(game),
      is_draw: game.isDraw
    };
    
    return {
      type: 'GAME_STATE_UPDATE',
      payload: JSON.stringify(payload)
    };
  }

  sendGameStarted(client, game) {
    if (!this.hub) {
      return;
    }
    
    const payload = {
      game_id: game.id,
      player1: game.player1.username,
      player2: game.player2.username,
      is_bot_game: game.isBotGame,
      board: game.board,
      current_turn: game.currentTurn,
      status: game.status
    };
    
    const msg = {
      type: 'GAME_STARTED',
      payload: JSON.stringify(payload)
    };
    
    const msgJSON = JSON.stringify(msg);
    this.hub.sendToClient(client.username, msgJSON);
    this.sendGameState(client, game);
  }

  sendWaiting(client) {
    if (!this.hub) {
      return;
    }
    
    const msg = {
      type: 'WAITING_FOR_OPPONENT'
    };
    
    const msgJSON = JSON.stringify(msg);
    this.hub.sendToClient(client.username, msgJSON);
  }

  sendError(client, errorMsg) {
    if (!this.hub) {
      return;
    }
    
    const payload = {
      message: errorMsg
    };
    
    const msg = {
      type: 'ERROR',
      payload: JSON.stringify(payload)
    };
    
    const msgJSON = JSON.stringify(msg);
    this.hub.sendToClient(client.username, msgJSON);
  }

  getWinnerUsername(game) {
    if (game.winner) {
      return game.winner.username;
    }
    return '';
  }

  // HandleBotGameActivated is called when a bot game activates after 10 seconds
  handleBotGameActivated(username, game) {
    if (!this.hub) {
      return;
    }
    
    // Find the client and send GAME_STARTED
    const client = this.hub.getClientByUsername(username);
    if (client && client.gameID === game.id) {
      this.sendGameStarted(client, game);
    }
  }
}

// NewHandler creates a new handler
function newHandler(hub, gameService, matchmaking) {
  return new Handler(hub, gameService, matchmaking);
}

module.exports = {
  Handler,
  newHandler
};
