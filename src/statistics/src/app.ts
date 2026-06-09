import express from 'express';
import cors from 'cors';
import { StatsController } from './controllers/stats.controller';
import { StatsService } from './services/stats.service';
import { KafkaService } from './services/kafka.service';
import { StatsRepository } from './repositories/stats.repository';
import { createAdminCheckMiddleware } from './middleware/auth.middleware';

const app = express();
app.use(cors());
app.use(express.json());

const statsRepo = new StatsRepository();
const statsService = new StatsService(statsRepo);
const kafkaService = new KafkaService(statsService);
const statsController = new StatsController(statsService);

const adminCheck = createAdminCheckMiddleware();

app.get('/manage/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/v1/stats/rentals', adminCheck, (req, res) => statsController.getRentalStats(req, res));
app.get('/api/v1/stats/payments', adminCheck, (req, res) => statsController.getPaymentStats(req, res));
app.get('/api/v1/stats/cars', adminCheck, (req, res) => statsController.getCarStats(req, res));
app.get('/api/v1/stats/users', adminCheck, (req, res) => statsController.getUserStats(req, res));

const PORT = process.env.PORT || 8040;
app.listen(PORT, async () => {
    console.log(`Stats Service успешно запущен на порту ${PORT}`);
    await kafkaService.start();
});