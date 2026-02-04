const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { connectDB, initSchema, getLeaderboard, incrementPlayerWins } = require('./db');
const KafkaProducer = require('./analytics');
const { newBoard, PLAYER1, PLAYER2, checkWin, checkDraw, getOpponent, validateMove, makeMove } = require('./game');
const Bot = require('./bot');
const Matchmaking = require('./matchmaking');

// Build database connection string from environment variables
function getDatabaseConnectionString() {
  // If DATABASE_URL is set (Vercel/cloud providers provide this), use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Otherwise, try to build from individual PostgreSQL env vars
  if (process.env.PGUSER && process.env.PGPASSWORD && process.env.PGHOST && process.env.PGPORT && process.env.PGDATABASE) {
    const user = encodeURIComponent(process.env.PGUSER);
    const password = encodeURIComponent(process.env.PGPASSWORD);
    const host = process.env.PGHOST;
    const port = process.env.PGPORT;
    const database = process.env.PGDATABASE;
    const sslMode = process.env.PGSSLMODE || 'require';
    return `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=${sslMode}`;
  }
  
  // Fallback to local development
  return 'postgres://postgres:PostGre%402025@localhost:5432/connectfour?sslmode=disable';
}

const DB_CONN_STR = getDatabaseConnectionString();
const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'game-events';
const PORT = process.env.PORT || 8080;

const GameStatus = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  FINISHED: 'finished'
};

const games = new Map();
const clients = new Map();

function createGame(player1Username, player2Username, isBotGame) {
  const gameID = uuidv4();
  
  const game = {
    id: gameID,
    player1: { username: player1Username, color: PLAYER1 },
    player2: { username: player2Username || 'Bot', color: PLAYER2 },
    currentTurn: PLAYER1,
    board: newBoard(),
    status: (isBotGame && !player2Username) ? GameStatus.WAITING : GameStatus.ACTIVE,
    winner: null,
    isDraw: false,
    startedAt: new Date(),
    endedAt: null,
    lastMoveAt: new Date(),
    isBotGame: isBotGame
  };
  
  games.set(gameID, game);
  
  return game;
}

function publishGameStartedEvent(game) {
  if (kafkaProducer) {
    const event = {
      type: 'GAME_STARTED',
      gameID: game.id,
      timestamp: new Date(),
      data: {
        player1: game.player1.username,
        player2: game.player2.username,
        isBotGame: game.isBotGame
      }
    };
    kafkaProducer.publishEvent(event).catch(() => {});
  }
}

function getGame(gameID) {
  return games.get(gameID);
}

async function processMove(gameID, player, column) {
  const game = games.get(gameID);
  if (!game) {
    throw new Error('game not found');
  }
  
  if (game.status !== GameStatus.ACTIVE) {
    throw new Error('game is not active');
  }
  
  if (game.currentTurn !== player) {
    throw new Error('not your turn');
  }
  
  if (!validateMove(game.board, column, player)) {
    throw new Error('invalid move');
  }
  
  const row = makeMove(game.board, column, player);
  if (row === -1) {
    throw new Error('invalid move');
  }
  
  game.lastMoveAt = new Date();
  
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
  
  if (game.status === GameStatus.FINISHED) {
    const winner = game.winner ? game.winner.username : '';
    if (winner && !game.isDraw && db) {
      incrementPlayerWins(db, winner).catch(err => {
        console.error('Failed to update player wins:', err);
      });
    }
    
    if (kafkaProducer) {
      const event = {
        type: 'GAME_ENDED',
        gameID: gameID,
        timestamp: new Date(),
        data: {
          winner: winner,
          isDraw: game.isDraw,
          player1: game.player1.username,
          player2: game.player2.username
        }
      };
      kafkaProducer.publishEvent(event).catch(() => {});
    }
  } else if (kafkaProducer) {
    const event = {
      type: 'MOVE_PLAYED',
      gameID: gameID,
      timestamp: new Date(),
      data: { player, column, row }
    };
    kafkaProducer.publishEvent(event).catch(() => {});
  }
  
  return { column, row };
}

async function getBotMove(gameID) {
  const game = games.get(gameID);
  if (!game) {
    throw new Error('game not found');
  }
  
  if (!game.isBotGame) {
    throw new Error('not a bot game');
  }
  
  if (game.currentTurn !== PLAYER2) {
    throw new Error('not your turn');
  }
  
  const bot = new Bot(PLAYER2);
  const column = bot.getBestMove(game.board);
  if (column === -1) {
    throw new Error('invalid move');
  }
  
  return await processMove(gameID, PLAYER2, column);
}

function handleMessage(client, message) {
  try {
    const msg = JSON.parse(message.toString());
    
    switch (msg.type) {
      case 'JOIN_GAME':
        handleJoinGame(client, msg.payload);
        break;
      case 'MOVE':
        handleMove(client, msg.payload);
        break;
      case 'RECONNECT':
        handleReconnect(client, msg.payload);
        break;
      default:
        sendError(client, 'Unknown message type');
    }
  } catch (err) {
    sendError(client, 'Invalid message format');
  }
}

function handleJoinGame(client, payload) {
  try {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    if (!data || !data.username) {
      sendError(client, 'Invalid join game data');
      return;
    }
    
    client.username = data.username;
    
    const result = matchmaking.joinQueue(data.username);
    if (!result || !result.game) {
      sendError(client, 'Failed to join game queue');
      return;
    }
    
    const { game, started } = result;
    client.gameID = game.id;
    
    if (started) {
      sendGameStarted(client, game);
    } else {
      sendWaiting(client);
    }
  } catch (err) {
    console.error('Error in handleJoinGame:', err);
    sendError(client, 'Failed to join game queue');
  }
}

async function handleMove(client, payload) {
  try {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    if (!data || typeof data.column !== 'number') {
      sendError(client, 'Invalid move data');
      return;
    }
    
    const game = getGame(client.gameID);
    if (!game) {
      sendError(client, 'Game not found');
      return;
    }
    
    let player = game.player1.color;
    if (client.username === game.player2.username) {
      player = game.player2.color;
    }
    
    await processMove(client.gameID, player, data.column);
    broadcastGameState(client.gameID);
    
    const updatedGame = getGame(client.gameID);
    if (updatedGame && updatedGame.isBotGame && 
        updatedGame.currentTurn === updatedGame.player2.color && 
        updatedGame.status === GameStatus.ACTIVE) {
      setTimeout(async () => {
        try {
          await getBotMove(client.gameID);
          broadcastGameState(client.gameID);
        } catch (err) {
          console.error('Error making bot move:', err);
        }
      }, 500);
    }
  } catch (err) {
    console.error('Error in handleMove:', err);
    sendError(client, err.message || 'Invalid move');
  }
}

function handleReconnect(client, payload) {
  try {
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    if (!data || !data.username) {
      sendError(client, 'Invalid reconnect data');
      return;
    }
    
    client.username = data.username;
    
    if (data.game_id) {
      const game = getGame(data.game_id);
      if (game && (game.player1.username === data.username || game.player2.username === data.username)) {
        client.gameID = game.id;
        sendGameState(client, game);
        return;
      }
    }
    
    sendError(client, 'No active game found');
  } catch (err) {
    console.error('Error in handleReconnect:', err);
    sendError(client, 'Failed to reconnect');
  }
}

function broadcastGameState(gameID) {
  const game = getGame(gameID);
  if (!game) {
    return;
  }
  
  const state = {
    type: 'GAME_STATE_UPDATE',
    payload: JSON.stringify({
      game_id: game.id,
      board: game.board,
      current_turn: game.currentTurn,
      status: game.status,
      winner: game.winner ? game.winner.username : '',
      is_draw: game.isDraw
    })
  };
  
  const stateJSON = JSON.stringify(state);
  
  for (const [ws, client] of clients) {
    if (client.gameID === gameID && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(stateJSON);
      } catch (err) {
        console.error('Error sending message:', err);
      }
    }
  }
}

function sendGameState(client, game) {
  const state = {
    type: 'GAME_STATE_UPDATE',
    payload: JSON.stringify({
      game_id: game.id,
      board: game.board,
      current_turn: game.currentTurn,
      status: game.status,
      winner: game.winner ? game.winner.username : '',
      is_draw: game.isDraw
    })
  };
  
  sendToClient(client.username, JSON.stringify(state));
}

function sendGameStarted(client, game) {
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
  
  sendToClient(client.username, JSON.stringify(msg));
  sendGameState(client, game);
}

function sendWaiting(client) {
  const msg = {
    type: 'WAITING_FOR_OPPONENT'
  };
  
  sendToClient(client.username, JSON.stringify(msg));
}

function sendError(client, errorMsg) {
  const msg = {
    type: 'ERROR',
    payload: JSON.stringify({ message: errorMsg })
  };
  
  sendToClient(client.username, JSON.stringify(msg));
}

function sendToClient(username, message) {
  for (const [ws, client] of clients) {
    if (client.username === username && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(message);
      } catch (err) {
        console.error('Error sending message:', err);
      }
    }
  }
}

function getClientByUsername(username) {
  for (const [ws, client] of clients) {
    if (client.username === username) {
      return client;
    }
  }
  return null;
}

let db;
let kafkaProducer;
let matchmaking;

async function main() {
  db = await connectDB(DB_CONN_STR);
  await initSchema(db);
  
  kafkaProducer = new KafkaProducer(KAFKA_BROKER, KAFKA_TOPIC);
  try {
    await kafkaProducer.connect();
  } catch (err) {
    console.warn('Kafka connection failed (analytics will be disabled)');
  }
  
  matchmaking = new Matchmaking({
    createGame: (player1, player2, isBot) => {
      const game = createGame(player1, player2, isBot);
      publishGameStartedEvent(game);
      return game;
    },
    getGame: getGame
  });
  
  matchmaking.setBotGameActivatedCallback((username, game) => {
    const client = getClientByUsername(username);
    if (client && client.gameID === game.id) {
      sendGameStarted(client, game);
    }
  });
  
  const app = express();
  app.use(express.json());
  
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });
  
  app.get('/leaderboard', async (req, res) => {
    try {
      const entries = await getLeaderboard(db, 10);
      res.json(entries);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  });
  
  const server = http.createServer(app);
  
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws',
    perMessageDeflate: false
  });
  
  wss.on('connection', (ws, req) => {
    console.log(`WebSocket client connected from ${req.socket.remoteAddress}`);
    
    const client = {
      username: '',
      gameID: '',
      ws: ws
    };
    
    clients.set(ws, client);
    
    ws.on('message', (message) => {
      if (message.length > 512) {
        ws.close(1009, 'Message too large');
        return;
      }
      handleMessage(client, message);
    });
    
    ws.on('close', () => {
      clients.delete(ws);
    });
    
    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      clients.delete(ws);
    });
    
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 54000);
    
    ws.on('close', () => {
      clearInterval(pingInterval);
    });
  });
  
  const frontendPath = path.join(__dirname, '../frontend/dist');
  try {
    const fs = require('fs');
    if (fs.existsSync(frontendPath)) {
      app.use(express.static(frontendPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
      });
    }
  } catch (err) {
    console.log('Frontend dist not found, skipping static file serving');
  }
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server starting on port ${PORT}`);
  });
  
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    try {
      if (kafkaProducer) {
        await kafkaProducer.close();
      }
    } catch (err) {}
    await db.end();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
