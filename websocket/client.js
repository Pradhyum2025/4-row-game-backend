const WebSocket = require('ws');

const WRITE_WAIT = 10 * 1000; // 10 seconds
const PONG_WAIT = 60 * 1000; // 60 seconds
const PING_PERIOD = (PONG_WAIT * 9) / 10; // 54 seconds
const MAX_MESSAGE_SIZE = 512;

// Client represents a WebSocket client connection
class Client {
  constructor(hub, ws, username) {
    this.hub = hub;
    this.ws = ws;
    this.username = username || '';
    this.gameID = '';
    this.isAlive = true;
    
    // Set up ping/pong
    this.ws.on('pong', () => {
      this.isAlive = true;
    });
  }

  // ReadPump reads messages from the WebSocket connection
  readPump() {
    this.ws.on('message', (message) => {
      // Limit message size
      if (message.length > MAX_MESSAGE_SIZE) {
        this.ws.close(1009, 'Message too large');
        return;
      }
      
      // Forward to handler
      if (this.hub && this.hub.handler) {
        this.hub.handler.handleMessage(this, message);
      }
    });

    this.ws.on('close', () => {
      if (this.hub) {
        this.hub.unregister(this);
      }
    });

    this.ws.on('error', (err) => {
      console.error('WebSocket error:', err);
      if (this.hub) {
        this.hub.unregister(this);
      }
    });

    // Set up ping interval
    const pingInterval = setInterval(() => {
      if (this.isAlive === false) {
        clearInterval(pingInterval);
        this.ws.terminate();
        return;
      }
      
      this.isAlive = false;
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, PING_PERIOD);

    this.ws.on('close', () => {
      clearInterval(pingInterval);
    });
  }

  // WritePump writes messages to the WebSocket connection
  // In Node.js with ws, we send directly instead of using channels
  send(message) {
    if (this.ws.readyState === WebSocket.OPEN) {
      try {
        // Send message separately (don't batch) to avoid frontend JSON parsing issues
        this.ws.send(message);
      } catch (err) {
        console.error('Error sending message:', err);
      }
    }
  }
}

// NewClient creates a new client
function newClient(hub, ws, username) {
  return new Client(hub, ws, username);
}

module.exports = {
  Client,
  newClient
};
