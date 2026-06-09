import { Kafka, Producer } from 'kafkajs';

export class KafkaService {
    private kafka: Kafka;
    private producer: Producer;
    private isConnected: boolean = false;

    constructor() {
        this.kafka = new Kafka({
            clientId: 'idp-service',
            brokers: (process.env.KAFKA_BROKERS || 'kafka-svc:29092').split(','),
        });
        this.producer = this.kafka.producer();
    }

    async connect(): Promise<void> {
        if (!this.isConnected) {
            try {
                await this.producer.connect();
                this.isConnected = true;
                console.log('Kafka producer connected');
            } catch (error) {
                console.error('Failed to connect Kafka producer:', error);
            }
        }
    }

    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.producer.disconnect();
            this.isConnected = false;
            console.log('Kafka producer disconnected');
        }
    }

    async sendEvent(topic: string, event: any): Promise<void> {
        if (!this.isConnected) {
            console.warn('Kafka producer not connected, skipping event:', event);
            return;
        }

        try {
            await this.producer.send({
                topic,
                messages: [{ value: JSON.stringify(event) }],
            });
            console.log(`Event sent to ${topic}:`, event);
        } catch (error) {
            console.error(`Failed to send event to ${topic}:`, error);
        }
    }
}