import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ClientRepository } from '../repositories/client.repository';
import { CryptoService } from '../services/crypto.service';
import { UserRepository } from '../repositories/user.repository';
import * as bcrypt from 'bcrypt';
import { KafkaService } from '../services/kafka.service';

export class OidcController {
    constructor(
        private authService: AuthService,
        private clientRepo: ClientRepository,
        private cryptoService: CryptoService,
        private userRepo: UserRepository,
        private kafkaService: KafkaService,
    ) {}

    private renderLoginPage(res: Response, clientName: string, client_id: string, redirect_uri: string, scope: string, response_type: string, state?: string, error?: string, username?: string): void {
        const errorBlock = error 
            ? `<div class="error-message">${error}</div>` 
            : '';
        const usernameValue = username ? `value="${username}"` : '';

        let html = `
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Вход в систему</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                    .login-card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 100%; max-width: 360px; }
                    .login-card h2 { margin-top: 0; margin-bottom: 24px; color: #1e293b; text-align: center; font-size: 20px; }
                    .form-group { margin-bottom: 16px; }
                    .form-group label { display: block; margin-bottom: 6px; color: #475569; font-size: 14px; font-weight: 500; }
                    .form-group input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
                    .form-group input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                    .btn-submit { width: 100%; padding: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background-color 0.2s; }
                    .btn-submit:hover { background-color: #2563eb; }
                    .error-message { background: #fef2f2; color: #b91c1c; padding: 12px 16px; border-radius: 6px; font-size: 14px; margin-bottom: 16px; border-left: 4px solid #ef4444; }
                </style>
            </head>
            <body>
                <div class="login-card">
                    <h2>Вход</h2>
                    ${errorBlock}
                    <form method="GET" action="/api/v1/authorize">
                        <input type="hidden" name="client_id" value="{{client_id}}">
                        <input type="hidden" name="redirect_uri" value="{{redirect_uri}}">
                        <input type="hidden" name="scope" value="{{scope}}">
                        <input type="hidden" name="response_type" value="{{response_type}}">
                        <input type="hidden" name="state" value="{{state}}">
                        <div class="form-group">
                            <label for="username">Имя пользователя</label>
                            <input type="text" id="username" name="username" placeholder="Введите логин" required autofocus ${usernameValue}>
                        </div>
                        <div class="form-group">
                            <label for="password">Пароль</label>
                            <input type="password" id="password" name="password" placeholder="Введите пароль" required>
                        </div>
                        <button type="submit" class="btn-submit">Войти</button>
                    </form>
                </div>
            </body>
            </html>
        `;

        html = html
            .replace('{{client_id}}', client_id || '')
            .replace('{{redirect_uri}}', redirect_uri || '')
            .replace('{{scope}}', scope || '')
            .replace('{{response_type}}', response_type || '')
            .replace('{{state}}', state || '');

        res.status(error ? 401 : 200).send(html);
    }

    private renderRegisterPage(res: Response, redirectUri: string, error?: string, username?: string, email?: string): void {
        const errorBlock = error 
            ? `<div class="error-message">${error}</div>` 
            : '';
        const usernameValue = username ? `value="${username}"` : '';
        const emailValue = email ? `value="${email}"` : '';

        res.status(error ? 400 : 200).send(`
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Регистрация</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                    .register-card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 100%; max-width: 360px; }
                    .register-card h2 { margin-top: 0; margin-bottom: 24px; color: #1e293b; text-align: center; font-size: 20px; }
                    .form-group { margin-bottom: 16px; }
                    .form-group label { display: block; margin-bottom: 6px; color: #475569; font-size: 14px; font-weight: 500; }
                    .form-group input { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
                    .form-group input:focus { outline: none; border-color: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1); }
                    .btn-submit { width: 100%; padding: 12px; background-color: #10b981; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background-color 0.2s; }
                    .btn-submit:hover { background-color: #059669; }
                    .error-message { background: #fef2f2; color: #b91c1c; padding: 12px 16px; border-radius: 6px; font-size: 14px; margin-bottom: 16px; border-left: 4px solid #ef4444; }
                </style>
            </head>
            <body>
                <div class="register-card">
                    <h2>Создание аккаунта</h2>
                    ${errorBlock}
                    <form method="POST" action="/api/v1/register">
                        <input type="hidden" name="redirect_uri" value="${redirectUri}">
                        <div class="form-group">
                            <label for="username">Имя пользователя</label>
                            <input type="text" id="username" name="username" placeholder="Придумайте логин" required autofocus ${usernameValue}>
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" placeholder="your@email.com" required ${emailValue}>
                        </div>
                        <div class="form-group">
                            <label for="password">Пароль</label>
                            <input type="password" id="password" name="password" placeholder="Минимум 6 символов" required minlength="6">
                        </div>
                        <button type="submit" class="btn-submit">Зарегистрироваться</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    }

    private renderCreateUserPage(res: Response, redirectUri: string, adminToken: string, error?: string, username?: string, email?: string): void {
        const errorBlock = error 
            ? `<div class="error-message">️ ${error}</div>` 
            : '';
        const usernameValue = username ? `value="${username}"` : '';
        const emailValue = email ? `value="${email}"` : '';

        res.status(error ? 400 : 200).send(`
            <!DOCTYPE html>
            <html lang="ru">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Создание пользователя</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f1f5f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
                    .form-card { background: white; padding: 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
                    .form-card h2 { margin-top: 0; margin-bottom: 24px; color: #1e293b; text-align: center; font-size: 20px; }
                    .form-group { margin-bottom: 16px; }
                    .form-group label { display: block; margin-bottom: 6px; color: #475569; font-size: 14px; font-weight: 500; }
                    .form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 14px; box-sizing: border-box; }
                    .form-group input:focus, .form-group select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
                    .btn-submit { width: 100%; padding: 12px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; font-size: 16px; font-weight: 600; cursor: pointer; transition: background-color 0.2s; }
                    .btn-submit:hover { background-color: #2563eb; }
                    .error-message { background: #fef2f2; color: #b91c1c; padding: 12px 16px; border-radius: 6px; font-size: 14px; margin-bottom: 16px; border-left: 4px solid #ef4444; }
                </style>
            </head>
            <body>
                <div class="form-card">
                    <h2>Создание пользователя</h2>
                    ${errorBlock}
                    <form method="POST" action="/api/v1/users/create">
                        <input type="hidden" name="admin_token" value="${adminToken}">
                        <input type="hidden" name="redirect_uri" value="${redirectUri}">
                        <div class="form-group">
                            <label for="username">Имя пользователя</label>
                            <input type="text" id="username" name="username" placeholder="Придумайте логин" required autofocus ${usernameValue}>
                        </div>
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email" placeholder="user@example.com" required ${emailValue}>
                        </div>
                        <div class="form-group">
                            <label for="password">Пароль</label>
                            <input type="password" id="password" name="password" placeholder="Минимум 6 символов" required minlength="6">
                        </div>
                        <div class="form-group">
                            <label for="role">Роль</label>
                            <select id="role" name="role">
                                <option value="User">Пользователь</option>
                                <option value="Admin">Администратор</option>
                            </select>
                        </div>
                        <button type="submit" class="btn-submit">Создать пользователя</button>
                    </form>
                </div>
            </body>
            </html>
        `);
    }

    // 1. GET /api/v1/authorize
    async handleAuthorize(req: Request, res: Response) {
        const { client_id, redirect_uri, scope, response_type, username, password, state } = req.query; 

        if (!client_id || !redirect_uri || !scope || response_type !== 'code') {
            return res.status(400).json({ error: 'Missing or invalid OIDC parameters' });
        }

        const client = await this.clientRepo.findById(client_id as string);
        if (!client) return res.status(400).json({ error: 'Unauthorized client_id' });
        if (client.redirect_uri !== redirect_uri) return res.status(400).json({ error: 'Invalid redirect_uri' });

        if (!username || !password) {
            return this.renderLoginPage(
                res, 
                client.client_name,
                client_id as string,
                redirect_uri as string,
                scope as string,
                response_type as string,
                state as string | undefined
            );
        }

        try {
            const code = await this.authService.generateAuthCode(
                username as string,
                password as string,
                client_id as string,
                redirect_uri as string,
                scope as string,
                state as string,
            );
            return res.redirect(`${redirect_uri}?code=${code}&state=${state}`);
        } catch (err: any) {
            const acceptHeader = req.headers.accept || '';
            const isHtmlRequest = acceptHeader.includes('text/html');

            if (!isHtmlRequest) {
                return res.status(401).json({ error: 'Authentication failed: ' + err.message });
            }

            return this.renderLoginPage(
                res, 
                client.client_name,
                client_id as string,
                redirect_uri as string,
                scope as string,
                response_type as string,
                state as string | undefined,
                err.message,
                username as string
            );
        }
    }

    // 2. POST /oauth/token
    async handleTokenExchange(req: Request, res: Response) {
        const { grant_type, client_id } = req.body;

        try {
            if (grant_type === 'authorization_code') {
                const { code, redirect_uri, client_secret } = req.body;
                if (!code || !client_id || !redirect_uri || !client_secret) {
                    return res.status(400).json({ error: 'Missing fields for authorization_code grant' });
                }
                const tokens = await this.authService.exchangeCodeForToken(code, client_id, client_secret, redirect_uri);
                return res.json(tokens);
            } else if (grant_type === 'refresh_token') {
                const { refresh_token, client_secret } = req.body;
                if (!refresh_token || !client_id || !client_secret) {
                    return res.status(400).json({ error: 'Missing fields for refresh_token grant' });
                }
                const tokens = await this.authService.refreshAccessToken(refresh_token, client_id, client_secret);
                return res.json(tokens);
            } else {
                return res.status(400).json({ error: 'Unsupported grant_type' });
            }
        } catch (err: any) {
            return res.status(400).json({ error: err.message });
        }
    }

    // 3. GET /.well-known/jwks.json
    handleJwks(req: Request, res: Response) {
        return res.json(this.cryptoService.getJwks());
    }

    // 4. GET /.well-known/openid-configuration
    handleConfiguration(req: Request, res: Response) {
        const baseUrl = process.env.ISSUER_URL || 'http://idp-svc:8090';
        return res.json({
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/api/v1/authorize`,
            token_endpoint: `${baseUrl}/oauth/token`,
            jwks_uri: `${baseUrl}/.well-known/jwks.json`,
            response_types_supported: ['code'],
            subject_types_supported: ['public'],
            id_token_signing_alg_values_supported: ['RS256'],
        });
    }

    // 5. POST /api/v1/register (обработка формы регистрации)
    async handleRegisterUser(req: Request, res: Response) {
        const { username, password, email, redirect_uri } = req.body;
        
        if (!username || !password || !email) {
            const isForm = req.is('application/x-www-form-urlencoded');
            if (isForm && redirect_uri) {
                return this.renderRegisterPage(res, redirect_uri, 'Все поля обязательны для заполнения', username, email);
            }
            return res.status(400).json({ error: 'Missing required user fields' });
        }

        try {
            const passwordHash = await bcrypt.hash(password, 10);
            const newUser = await this.userRepo.createUser(username, passwordHash, email, ['User']);
            
            await this.kafkaService.sendEvent('user-events', {
                username: newUser.username,
                action: 'registered',
                timestamp: new Date().toISOString(),
            });

            const isFormSubmission = req.is('application/x-www-form-urlencoded');

            if (isFormSubmission && redirect_uri) {
                const separator = redirect_uri.includes('?') ? '&' : '?';
                return res.redirect(`${redirect_uri}${separator}registered=true`);
            }

            return res.status(201).json({ 
                id: newUser.id, 
                username: newUser.username, 
                email: newUser.email, 
                roles: newUser.roles,
                message: 'Registration successful. Please login to get access token.'
            });
        } catch (err: any) {
            const isForm = req.is('application/x-www-form-urlencoded');
            
            if (err.code === '23505') {
                if (isForm && redirect_uri) {
                    return this.renderRegisterPage(res, redirect_uri, 'Пользователь с таким именем или email уже существует', username, email);
                }
                return res.status(409).json({ error: 'Username or email already exists' });
            }
            
            if (isForm && redirect_uri) {
                return this.renderRegisterPage(res, redirect_uri, 'Ошибка регистрации: ' + err.message, username, email);
            }
            return res.status(500).json({ error: 'User registration failed: ' + err.message });
        }
    }

    // 6. GET /api/v1/register-page (отображение формы регистрации)
    async handleRegisterPage(req: Request, res: Response) {
        const redirect_uri = (req.query.redirect_uri as string) || 'http://localhost:4200/login?registered=true';
        return this.renderRegisterPage(res, redirect_uri);
    }

    // 7. GET /api/v1/users/create-page (отображение формы создания пользователя админом)
    async handleCreateUserPage(req: Request, res: Response) {
        const { admin_token, redirect_uri } = req.query;

        if (!admin_token) {
            return res.status(400).json({ error: 'Admin token is required' });
        }

        try {
            const payload = this.cryptoService.verifyToken(admin_token as string);
            if (!payload.roles || !payload.roles.includes('Admin')) {
                return res.status(403).json({ error: 'Access denied: Admin role required' });
            }
        } catch (err) {
            return res.status(401).json({ error: 'Invalid or expired admin token' });
        }

        const redirectUri = (redirect_uri as string) || 'http://localhost:4200/admin/users';
        return this.renderCreateUserPage(res, redirectUri, admin_token as string);
    }

    // 8. POST /api/v1/users/create (обработка формы создания пользователя админом)
    async handleCreateUserForm(req: Request, res: Response) {
        const { username, password, email, role, admin_token, redirect_uri } = req.body;

        if (!username || !password || !email || !admin_token) {
            const isForm = req.is('application/x-www-form-urlencoded');
            if (isForm && redirect_uri && admin_token) {
                return this.renderCreateUserPage(res, redirect_uri, admin_token, 'Все поля обязательны для заполнения', username, email);
            }
            return res.status(400).json({ error: 'Missing required fields' });
        }

        try {
            const payload = this.cryptoService.verifyToken(admin_token);
            if (!payload.roles || !payload.roles.includes('Admin')) {
                if (redirect_uri) {
                    return res.redirect(`${redirect_uri}?error=forbidden`);
                }
                return res.status(403).json({ error: 'Access denied: Admin role required' });
            }
        } catch (err) {
            if (redirect_uri) {
                return res.redirect(`${redirect_uri}?error=invalid_token`);
            }
            return res.status(401).json({ error: 'Invalid or expired admin token' });
        }

        try {
            const passwordHash = await bcrypt.hash(password, 10);
            const assignedRoles = role ? [role] : ['User'];
            const newUser = await this.userRepo.createUser(username, passwordHash, email, assignedRoles);

            await this.kafkaService.sendEvent('user-events', {
                username: newUser.username, 
                action: 'created',
                timestamp: new Date().toISOString(),
            });

            if (req.is('application/x-www-form-urlencoded') && redirect_uri) {
                return res.redirect(`${redirect_uri}?created=true`);
            }

            return res.status(201).json({
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                roles: newUser.roles,
            });
        } catch (err: any) {
            const isForm = req.is('application/x-www-form-urlencoded');
            
            if (err.code === '23505') {
                if (isForm && redirect_uri && admin_token) {
                    return this.renderCreateUserPage(res, redirect_uri, admin_token, 'Пользователь с таким именем или email уже существует', username, email);
                }
                return res.status(409).json({ error: 'Username or email already exists' });
            }
            
            if (isForm && redirect_uri && admin_token) {
                return this.renderCreateUserPage(res, redirect_uri, admin_token, 'Ошибка создания: ' + err.message, username, email);
            }
            return res.status(500).json({ error: 'User creation failed: ' + err.message });
        }
    }

    // 9. POST /api/v1/users (бэкдор для JSON-запросов)
    async handleCreateUser(req: Request, res: Response) {
        const { username, password, email, roles } = req.body;
        if (!username || !password || !email) {
            return res.status(400).json({ error: 'Missing required user fields' });
        }

        try {
            const passwordHash = await bcrypt.hash(password, 10);
            const assignedRoles = roles || ['User'];
            const newUser = await this.userRepo.createUser(username, passwordHash, email, assignedRoles);
            
            await this.kafkaService.sendEvent('user-events', {
                username: newUser.username,
                action: 'created',
                timestamp: new Date().toISOString(),
            });

            return res.status(201).json({ 
                id: newUser.id, 
                username: newUser.username, 
                email: newUser.email, 
                roles: newUser.roles 
            });
        } catch (err: any) {
            if (err.code === '23505') {
                return res.status(409).json({ error: 'Username or email already exists' });
            }
            return res.status(500).json({ error: 'User creation failed: ' + err.message });
        }
    }
}