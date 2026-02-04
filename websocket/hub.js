// Hub maintains the set of active clients and broadcasts messages
class Hub {
  constructor(handler) {
    this.clients = new Map();
    this.handler = handler;
  }

  // Register registers a new client
  register(client) {
    this.clients.set(client, true);
  }

  // Unregister removes a client
  unregister(client) {
    if (this.clients.has(client)) {
      this.clients.delete(client);
      if (client.ws) {
        try {
          client.ws.close();
        } catch (err) {
          // Ignore errors on close
        }
      }
    }
  }

  // BroadcastToGame sends a message to all clients in a game
  broadcastToGame(gameID, message) {
    for (const [client] of this.clients) {
      if (client.gameID === gameID) {
        try {
          if (client.ws && client.ws.readyState === 1) { // WebSocket.OPEN
            client.ws.send(message);
          }
        } catch (err) {
          console.error('Error sending message to client:', err);
          this.unregister(client);
        }
      }
    }
  }

  // SendToClient sends a message to a specific client by username
  sendToClient(username, message) {
    for (const [client] of this.clients) {
      if (client.username === username) {
        try {
          if (client.ws && client.ws.readyState === 1) { // WebSocket.OPEN
            client.ws.send(message);
          }
        } catch (err) {
          console.error('Error sending message to client:', err);
          this.unregister(client);
        }
      }
    }
  }

  // GetClientByUsername gets a client by username
  getClientByUsername(username) {
    for (const [client] of this.clients) {
      if (client.username === username) {
        return client;
      }
    }
    return null;
  }
}

// NewHub creates a new hub
function newHub(handler) {
  return new Hub(handler);
}

module.exports = {
  Hub,
  newHub
};
