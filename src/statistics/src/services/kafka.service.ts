import { Kafka, Consumer } from 'kafkajs';
import { StatsService } from './stats.service';

export class KafkaService {
    private kafka: Kafka;
    private consumer: Consumer;
    private statsService: StatsService;

    constructor(statsService: StatsService) {
        this.statsService = statsService;
        this.kafka = new Kafka({
            clientId: 'stats-service',
            brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
        });
        this.consumer = this.kafka.consumer({ groupId: 'stats-service-group' });
    }

    async start() {
        try {
            await this.consumer.connect();
            console.log('Kafka consumer connected');

            await this.consumer.subscribe({ topic: 'rental-events', fromBeginning: true });
            await this.consumer.subscribe({ topic: 'payment-events', fromBeginning: true });
            await this.consumer.subscribe({ topic: 'car-events', fromBeginning: true });
            await this.consumer.subscribe({ topic: 'user-events', fromBeginning: true });

            // Запуск обработки сообщений
            await this.consumer.run({
                eachMessage: async ({ topic, partition, message }) => {
                    const value = message.value?.toString();
                    if (!value) return;

                    const event = JSON.parse(value);
                    console.log(`Received event from ${topic}:`, event);

                    switch (topic) {
                        case 'rental-events':
                            await this.statsService.handleRentalEvent(event);
                            break;
                        case 'payment-events':
                            await this.statsService.handlePaymentEvent(event);
                            break;
                        case 'car-events':
                            await this.statsService.handleCarEvent(event);
                            break;
                        case 'user-events':
                            await this.statsService.handleUserEvent(event);
                            break;
                        default:
                            console.warn(`Unknown topic: ${topic}`);
                    }
                    
                    console.log(`Successfully processed event from ${topic}`);
                },
            });

            console.log('Kafka consumer started');
        } catch (error) {
            console.error('Failed to start Kafka consumer:', error);
        }
    }

    async stop() {
        await this.consumer.disconnect();
    }
}