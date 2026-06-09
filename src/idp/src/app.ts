import express from 'express';
import { CryptoService } from './services/crypto.service';
import { ClientRepository } from './repositories/client.repository';
import { UserRepository } from './repositories/user.repository';
import { AuthRepository } from './repositories/auth.repository';
import { AuthService } from './services/auth.service';
import { OidcController } from './controllers/oidc.controller';
import { createAdminCheckMiddleware } from './middleware/auth.middleware';
import { KafkaService } from './services/kafka.service';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cryptoService = new CryptoService();
const kafkaService = new KafkaService();

const clientRepo = new ClientRepository();
const userRepo = new UserRepository();
const authRepo = new AuthRepository();


const authService = new AuthService(userRepo, authRepo, clientRepo, cryptoService, kafkaService);
const oidcController = new OidcController(authService, clientRepo, cryptoService, userRepo, kafkaService);

const adminCheck = createAdminCheckMiddleware(cryptoService);

app.get('/api/v1/authorize', (req, res) => oidcController.handleAuthorize(req, res));
app.post('/oauth/token', (req, res) => oidcController.handleTokenExchange(req, res));
app.get('/.well-known/jwks.json', (req, res) => oidcController.handleJwks(req, res));
app.get('/.well-known/openid-configuration', (req, res) => oidcController.handleConfiguration(req, res));

app.get('/api/v1/register-page', (req, res) => oidcController.handleRegisterPage(req, res));
app.post('/api/v1/register', (req, res) => oidcController.handleRegisterUser(req, res));

app.get('/api/v1/users/create-page', (req, res) => oidcController.handleCreateUserPage(req, res));
app.post('/api/v1/users/create', (req, res) => oidcController.handleCreateUserForm(req, res));

app.post('/api/v1/users', adminCheck, (req, res) => oidcController.handleCreateUser(req, res));

app.get('/manage/health', (req, res) => {
    res.status(200).send('OK');
});

const PORT = process.env.PORT || 8090;

app.listen(PORT, async () => {
    console.log(`Identity Provider успешно запущен на порту ${PORT}`);
    await kafkaService.connect();
});

process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    await kafkaService.disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    await kafkaService.disconnect();
    process.exit(0);
});