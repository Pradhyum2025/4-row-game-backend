const GameStatus = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  FINISHED: 'finished'
};

class Matchmaking {
  constructor(createGameCallback) {
    this.queue = [];
    this.timers = new Map();
    this.createGameCallback = createGameCallback;
    this.onBotGameActivated = null;
  }

  setBotGameActivatedCallback(callback) {
    this.onBotGameActivated = callback;
  }

  joinQueue(username) {
    const existingIndex = this.queue.findIndex(qp => qp.username === username);
    if (existingIndex !== -1) {
      const qp = this.queue[existingIndex];
      this.queue.splice(existingIndex, 1);
      if (this.timers.has(username)) {
        clearTimeout(this.timers.get(username));
        this.timers.delete(username);
      }
      const game = this.createGameCallback.getGame(qp.gameID);
      if (game) {
        return { game, started: game.status === GameStatus.ACTIVE };
      }
    }
    
    if (this.queue.length === 0) {
      const game = this.createGameCallback.createGame(username, '', true);
      const qp = {
        username: username,
        gameID: game.id,
        joinedAt: new Date()
      };
      this.queue.push(qp);
      
      const timer = setTimeout(() => {
        const index = this.queue.findIndex(qp => qp.username === username);
        if (index !== -1) {
          const qp = this.queue[index];
          const game = this.createGameCallback.getGame(qp.gameID);
          if (game && game.status === GameStatus.WAITING) {
            game.status = GameStatus.ACTIVE;
            if (this.onBotGameActivated) {
              this.onBotGameActivated(username, game);
            }
          }
          this.queue.splice(index, 1);
          this.timers.delete(username);
        }
      }, 10000);
      
      this.timers.set(username, timer);
      
      return { game, started: false };
    }
    
    const firstPlayer = this.queue[0];
    this.queue.shift();
    
    if (this.timers.has(firstPlayer.username)) {
      clearTimeout(this.timers.get(firstPlayer.username));
      this.timers.delete(firstPlayer.username);
    }
    
    const game = this.createGameCallback.createGame(firstPlayer.username, username, false);
    
    return { game, started: true };
  }
}

module.exports = Matchmaking;
