import { UserRepository, UserRow } from '../repositories/user.repository';
import { AuthRepository } from '../repositories/auth.repository';
import { CryptoService } from './crypto.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ClientRepository } from '../repositories/client.repository';
import { KafkaService } from './kafka.service';

export class AuthService {
    constructor(
        private userRepo: UserRepository,
        private authRepo: AuthRepository,
        private clientRepo: ClientRepository,
        private cryptoService: CryptoService,
        private kafkaService: KafkaService,
    ) {}

    async generateAuthCode(username: string, passwordPlain: string, clientId: string, redirectUri: string, scope: string, state: string): Promise<string> {
        const user = await this.userRepo.findByUsername(username);
        if (!user) throw new Error('Ошибка авторизации');

        const isMatch = await bcrypt.compare(passwordPlain, user.password_hash);
        if (!isMatch) throw new Error('Ошибка ввода пароля');

        const code = uuidv4();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // Код живет 5 минут

        await this.authRepo.saveCode(code, user.id, clientId, redirectUri, scope, expiresAt, state);
        return code;
    }

    async exchangeCodeForToken(
        code: string, 
        clientId: string, 
        clientSecret: string,
        redirectUri: string
    ) {
        const authCode = await this.authRepo.findAndUseCode(code);
        if (!authCode) throw new Error('Authorization code not found or already used');
        if (authCode.expires_at < new Date()) throw new Error('Authorization code expired');
        
        const client = await this.clientRepo.findById(clientId);
        if (!client || client.client_secret !== clientSecret) {
            throw new Error('Invalid client credentials');
        }

        if (authCode.client_id !== clientId || authCode.redirect_uri !== redirectUri) {
            throw new Error('Invalid client details or redirect URI');
        }

        const pool = require('../config/db').pool;
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [authCode.user_id]);
        const user: UserRow = userRes.rows[0];

        const payload: any = { 
            roles: user.roles,
            user_id: user.id  
        };

        if (authCode.scope.includes('profile')) {
            payload.preferred_username = user.username; 
        }
        if (authCode.scope.includes('email')) {
            payload.email = user.email;
        }

        const accessToken = this.cryptoService.generateJwt(payload, user.id, clientId);

        const refreshToken = uuidv4();
        const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await this.authRepo.saveRefreshToken(refreshToken, user.id, clientId, refreshExpiresAt);

        await this.kafkaService.sendEvent('user-events', {
            username: user.username,
            action: 'login',
            timestamp: new Date().toISOString(),
        });

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: 3600,
            scope: authCode.scope,
        };
    }

    async refreshAccessToken(refreshTokenStr: string, clientId: string, clientSecret: string) {  // ДОБАВЛЕНО
        const storedToken = await this.authRepo.findRefreshToken(refreshTokenStr);
        if (!storedToken) throw new Error('Invalid refresh token');
        if (storedToken.expires_at < new Date()) {
            await this.authRepo.deleteRefreshToken(refreshTokenStr);
            throw new Error('Refresh token expired');
        }
        if (storedToken.client_id !== clientId) throw new Error('Client mismatch');
        
        const client = await this.clientRepo.findById(clientId);
        if (!client || client.client_secret !== clientSecret) {
            throw new Error('Invalid client credentials');
        }

        const pool = require('../config/db').pool;
        const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [storedToken.user_id]);
        const user = userRes.rows[0];

        const payload: any = { 
            roles: user.roles,
            user_id: user.id
        };
        if (true) {
            payload.preferred_username = user.username;
        }
        if (user.email) {
            payload.email = user.email;
        }

        const newAccessToken = this.cryptoService.generateJwt(payload, user.id, clientId);
        await this.authRepo.deleteRefreshToken(refreshTokenStr);
        const newRefreshToken = uuidv4();
        const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await this.authRepo.saveRefreshToken(newRefreshToken, user.id, clientId, refreshExpiresAt);

        await this.kafkaService.sendEvent('user-events', {
            username: user.username,
            action: 'token_refreshed',
            timestamp: new Date().toISOString(),
        });

        return {
            access_token: newAccessToken,
            refresh_token: newRefreshToken,
            token_type: 'Bearer',
            expires_in: 3600,
        };
    }
}