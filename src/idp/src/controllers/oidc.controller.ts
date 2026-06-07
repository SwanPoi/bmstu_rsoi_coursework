import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ClientRepository } from '../repositories/client.repository';
import { CryptoService } from '../services/crypto.service';
import { UserRepository } from '../repositories/user.repository';
import * as bcrypt from 'bcrypt';

export class OidcController {
    constructor(
        private authService: AuthService,
        private clientRepo: ClientRepository,
        private cryptoService: CryptoService,
        private userRepo: UserRepository
    ) {}

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
            return res.status(200).send(`
                <form method="GET" action="/api/v1/authorize">
                <h2>Identity Provider Login (${client.client_name})</h2>
                <input type="hidden" name="client_id" value="${client_id}"/>
                <input type="hidden" name="redirect_uri" value="${redirect_uri}"/>
                <input type="hidden" name="scope" value="${scope}"/>
                <input type="hidden" name="response_type" value="${response_type}"/>
                <input type="text" name="username" placeholder="Username" required/><br/><br/>
                <input type="password" name="password" placeholder="Password" required/><br/><br/>
                <button type="submit">Sign In & Authorize</button>
                </form>
            `);
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
            return res.status(401).send(`Authentication failed: ${err.message}`);
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
                const tokens = await this.authService.exchangeCodeForToken(
                    code, 
                    client_id, 
                    client_secret,
                    redirect_uri
                );
                return res.json(tokens);
            } else if (grant_type === 'refresh_token') {
                const { refresh_token, client_secret } = req.body;
                if (!refresh_token || !client_id || !client_secret) {
                    return res.status(400).json({ error: 'Missing fields for refresh_token grant' });
                }
                const tokens = await this.authService.refreshAccessToken(
                    refresh_token, 
                    client_id,
                    client_secret
                );
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

    // 5. POST /api/v1/users 
    async handleCreateUser(req: Request, res: Response) {
        const { username, password, email, roles } = req.body;
        if (!username || !password || !email) {
            return res.status(400).json({ error: 'Missing required user fields' });
        }

        try {
            const passwordHash = await bcrypt.hash(password, 10);
            const assignedRoles = roles || ['User'];
            const newUser = await this.userRepo.createUser(username, passwordHash, email, assignedRoles);
            
            return res.status(201).json({ id: newUser.id, username: newUser.username, email: newUser.email, roles: newUser.roles });
        } catch (err: any) {
            return res.status(500).json({ error: 'User creation failed: ' + err.message });
        }
    }

    async handleRegisterUser(req: Request, res: Response) {
        const { username, password, email } = req.body;
        if (!username || !password || !email) {
            return res.status(400).json({ error: 'Missing required user fields' });
        }

        try {
            const passwordHash = await bcrypt.hash(password, 10);
            const newUser = await this.userRepo.createUser(username, passwordHash, email, ['User']);
            
            return res.status(201).json({ 
                id: newUser.id, 
                username: newUser.username, 
                email: newUser.email, 
                roles: newUser.roles,
                message: 'Registration successful. Please login to get access token.'
            });
        } catch (err: any) {
            if (err.code === '23505') {
                return res.status(409).json({ error: 'Username or email already exists' });
            }
            return res.status(500).json({ error: 'User registration failed: ' + err.message });
        }
    }
}