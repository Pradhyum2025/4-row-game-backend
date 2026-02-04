const { Kafka } = require('kafkajs');

class KafkaProducer {
  constructor(broker, topic) {
    const kafka = new Kafka({
      clientId: '4-row-game-backend',
      brokers: [broker]
    });
    
    this.producer = kafka.producer();
    this.topic = topic;
    this.connected = false;
  }

  async connect() {
    if (!this.connected) {
      try {
        await this.producer.connect();
        this.connected = true;
        console.log('Connected to Kafka');
      } catch (err) {
        console.warn('Failed to connect to Kafka (analytics will be disabled):', err.message);
        this.connected = false;
      }
    }
  }

  async publishEvent(event) {
    if (!this.connected) {
      await this.connect();
    }

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
    } catch (err) {
      console.warn('Failed to publish event to Kafka (non-critical):', err.message);
    }
  }

  async close() {
    if (this.connected) {
      await this.producer.disconnect();
      this.connected = false;
    }
  }
}

// Analytics consumer
async function startAnalyticsConsumer() {
  const KAFKA_BROKER = process.env.KAFKA_BROKER || 'localhost:9092';
  const KAFKA_TOPIC = process.env.KAFKA_TOPIC || 'game-events';
  const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || 'analytics-consumer';

  const kafka = new Kafka({
    clientId: 'analytics-consumer',
    brokers: [KAFKA_BROKER]
  });
  
  const consumer = kafka.consumer({ groupId: KAFKA_GROUP_ID });
  
  await consumer.connect();
  console.log('Connected to Kafka');
  
  await consumer.subscribe({ topic: KAFKA_TOPIC, fromBeginning: false });
  console.log(`Subscribed to topic: ${KAFKA_TOPIC}`);
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const event = JSON.parse(message.value.toString());
        console.log(`[${new Date().toISOString()}] Event: ${event.type} | Game: ${event.gameID}`);
        
        if (event.data) {
          console.log('  Data:', JSON.stringify(event.data, null, 2));
        }
      } catch (err) {
        console.error('Error processing message:', err);
      }
    }
  });
  
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await consumer.disconnect();
    process.exit(0);
  });
}

if (require.main === module) {
  startAnalyticsConsumer().catch(err => {
    console.error('Failed to start analytics consumer:', err);
    process.exit(1);
  });
}

module.exports = KafkaProducer;
