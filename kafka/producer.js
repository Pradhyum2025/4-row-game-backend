const { Kafka } = require('kafkajs');

// Producer handles publishing events to Kafka
class Producer {
  constructor(broker, topic) {
    const kafka = new Kafka({
      clientId: '4-row-game-backend',
      brokers: [broker]
    });
    
    this.producer = kafka.producer();
    this.topic = topic;
    this.connected = false;
  }

  // Connect connects to Kafka
  async connect() {
    if (!this.connected) {
      try {
        await this.producer.connect();
        this.connected = true;
        console.log('Connected to Kafka');
      } catch (err) {
        console.warn('Failed to connect to Kafka (analytics will be disabled):', err.message);
        this.connected = false;
        // Don't throw - allow server to continue without Kafka
      }
    }
  }

  // PublishEvent publishes a game event to Kafka
  async publishEvent(event) {
    if (!this.connected) {
      await this.connect();
    }

    // If still not connected, silently fail (Kafka is optional)
    if (!this.connected) {
      return;
    }

    event.timestamp = new Date();

    try {
      await this.producer.send({
        topic: this.topic,
        messages: [{
          key: event.gameID,
          value: JSON.stringify(event)
        }]
      });
      
      console.log(`Published event ${event.type} for game ${event.gameID}`);
    } catch (err) {
      // Log error but don't throw - Kafka is optional for analytics
      console.warn('Failed to publish event to Kafka (non-critical):', err.message);
    }
  }

  // Close closes the Kafka producer
  async close() {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }
}

// NewProducer creates a new Kafka producer
function newProducer(broker, topic) {
  return new Producer(broker, topic);
}

module.exports = {
  Producer,
  newProducer
};
