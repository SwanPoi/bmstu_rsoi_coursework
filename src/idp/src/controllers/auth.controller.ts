// import { Router, Request, Response } from 'express';
// import { IdpService } from '../services/idp.service';

// export class AuthController {
//     public router: Router;
//     constructor(private service: IdpService, private issuerUrl: string) {
//         this.router = Router();
//         this.setupRoutes();
//     }

//     private setupRoutes() {
//         // 1. Авторизация (GET - показ формы)
//         this.router.get('/authorize', (req: Request, res: Response) => {
//             const { client_id, redirect_uri, scope, state, nonce, code_challenge, code_challenge_method } = req.query;
            
//             if (code_challenge_method !== 'S256' || !code_challenge) {
//                 return res.status(400).send('PKCE code_challenge and S256 method are required');
//             }

//             res.send(`
//                 <h2>Sign In to IdP</h2>
//                 <form method="POST" action="/authorize">
//                     <input type="hidden" name="client_id" value="${client_id}">
//                     <input type="hidden" name="redirect_uri" value="${redirect_uri}">
//                     <input type="hidden" name="scope" value="${scope}">
//                     <input type="hidden" name="state" value="${state}">
//                     <input type="hidden" name="nonce" value="${nonce}">
//                     <input type="hidden" name="code_challenge" value="${code_challenge}">
//                     <input type="hidden" name="code_challenge_method" value="${code_challenge_method}">
//                     <input type="text" name="username" placeholder="Username (try: admin)" required><br><br>
//                     <input type="password" name="password" placeholder="Password (try: admin)" required><br><br>
//                     <button type="submit">Login</button>
//                 </form>
//             `);
//         });

//         // 2. Авторизация (POST - обработка логина)
//         this.router.post('/authorize', async (req: Request, res: Response) => {
//             try {
//                 const { username, password, client_id, redirect_uri, scope, state, nonce, code_challenge, code_challenge_method } = req.body;
//                 const user = await this.service.authenticate(username, password);
                
//                 const code = await this.service.createAuthCode(
//                     user.user_uid, client_id, redirect_uri, scope, nonce, code_challenge, code_challenge_method
//                 );

//                 const url = new URL(redirect_uri);
//                 url.searchParams.set('code', code);
//                 if (state) url.searchParams.set('state', state);
//                 res.redirect(url.toString());
//             } catch (err: any) {
//                 res.status(401).send(`<h2>Login Failed</h2><p>${err.message}</p><a href="javascript:history.back()">Back</a>`);
//             }
//         });

//         // 3. Обмен кода на токен
//         this.router.post('/token', async (req: Request, res: Response) => {
//             try {
//                 const { grant_type, code, client_id, redirect_uri, code_verifier } = req.body;
//                 if (grant_type !== 'authorization_code') {
//                     return res.status(400).json({ error: 'unsupported_grant_type' });
//                 }

//                 const tokens = await this.service.exchangeCodeForToken(code, client_id, redirect_uri, code_verifier);
//                 res.json(tokens);
//             } catch (err: any) {
//                 res.status(400).json({ error: 'invalid_grant', error_description: err.message });
//             }
//         });
//     }
// }