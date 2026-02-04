const { GameStatus } = require('../models/game');

// MatchmakingService handles player matchmaking
class MatchmakingService {
  constructor(gameService) {
    this.queue = [];
    this.gameService = gameService;
    this.timers = new Map(); // username -> timer
    this.onBotGameActivated = null; // Callback when bot game activates
  }

  // SetBotGameActivatedCallback sets callback for bot game activation
  setBotGameActivatedCallback(callback) {
    this.onBotGameActivated = callback;
  }

  // JoinQueue adds a player to the matchmaking queue
  joinQueue(username) {
    // Check if player is already in queue - remove them first to allow re-join
    const existingIndex = this.queue.findIndex(qp => qp.username === username);
    if (existingIndex !== -1) {
      const qp = this.queue[existingIndex];
      // Remove from queue
      this.queue.splice(existingIndex, 1);
      // Cancel timer if exists
      if (this.timers.has(username)) {
        clearTimeout(this.timers.get(username));
        this.timers.delete(username);
      }
      // Get existing game
      const game = this.gameService.getGame(qp.gameID);
      if (game) {
        return { game, started: game.status === GameStatus.ACTIVE };
      }
      // If game doesn't exist, continue to create new one
    }
    
    // If queue is empty, add player and start timer
    if (this.queue.length === 0) {
      const game = this.gameService.createGame(username, '', true);
      const qp = {
        username: username,
        gameID: game.id,
        joinedAt: new Date()
      };
      this.queue.push(qp);
      
      // Start 10-second timer for bot fallback
      const timer = setTimeout(() => {
        // Check if still waiting
        const index = this.queue.findIndex(qp => qp.username === username);
        if (index !== -1) {
          const qp = this.queue[index];
          // Bot game already created, activate it
          const game = this.gameService.getGame(qp.gameID);
          if (game && game.status === GameStatus.WAITING) {
            game.status = GameStatus.ACTIVE;
            // Notify handler that bot game has activated
            if (this.onBotGameActivated) {
              this.onBotGameActivated(username, game);
            }
          }
          // Remove from queue
          this.queue.splice(index, 1);
          this.timers.delete(username);
        }
      }, 10000); // 10 seconds
      
      this.timers.set(username, timer);
      
      return { game, started: false }; // false = waiting for opponent
    }
    
    // Match found - pair with first player in queue
    const firstPlayer = this.queue[0];
    this.queue.shift();
    
    // Cancel timer if exists
    if (this.timers.has(firstPlayer.username)) {
      clearTimeout(this.timers.get(firstPlayer.username));
      this.timers.delete(firstPlayer.username);
    }
    
    // Create PvP game
    const game = this.gameService.createGame(firstPlayer.username, username, false);
    
    return { game, started: true }; // true = game started
  }

  // RemoveFromQueue removes a player from queue
  removeFromQueue(username) {
    const index = this.queue.findIndex(qp => qp.username === username);
    if (index !== -1) {
      this.queue.splice(index, 1);
      if (this.timers.has(username)) {
        clearTimeout(this.timers.get(username));
        this.timers.delete(username);
      }
    }
  }
}

// NewMatchmakingService creates a new matchmaking service
function newMatchmakingService(gameService) {
  return new MatchmakingService(gameService);
}

module.exports = {
  MatchmakingService,
  newMatchmakingService
};
