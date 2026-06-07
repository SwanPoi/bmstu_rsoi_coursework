// import bcrypt from 'bcrypt';
// import crypto from 'crypto';
// import { IdpRepository } from '../repository/idp.repository';
// import { CryptoService } from './crypto.service';
// import { AuthCode } from '../domain/models';

// export class IdpService {
//     constructor(
//         private repo: IdpRepository,
//         private cryptoService: CryptoService,
//         private issuerUrl: string
//     ) {}

//     private generateRandomString(length: number): string {
//         return crypto.randomBytes(length).toString('base64url');
//     }

//     // Проверка PKCE S256
//     private verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
//         const hash = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
//         return hash === codeChallenge;
//     }

//     async authenticate(username: string, password: string) {
//         const user = await this.repo.getUserByUsername(username);
//         if (!user || !user.enabled) throw new Error('Invalid credentials');
        
//         const isValid = await bcrypt.compare(password, user.password_hash);
//         if (!isValid) throw new Error('Invalid credentials');
        
//         return user;
//     }

//     async createAuthCode(userUid: string, clientId: string, redirectUri: string, scope: string, nonce: string | null, codeChallenge: string, codeChallengeMethod: string): Promise<string> {
//         const code = this.generateRandomString(32);
//         const authCode: AuthCode = {
//             code,
//             user_uid: userUid,
//             client_id: clientId,
//             redirect_uri: redirectUri,
//             scope,
//             nonce,
//             code_challenge: codeChallenge,
//             code_challenge_method: codeChallengeMethod,
//             expires_at: new Date(Date.now() + 5 * 60 * 1000), // 5 минут
//             used: false
//         };
//         await this.repo.createAuthCode(authCode);
//         return code;
//     }

//     async exchangeCodeForToken(code: string, clientId: string, redirectUri: string, codeVerifier: string) {
//         const authCode = await this.repo.getAuthCode(code);
//         if (!authCode || authCode.client_id !== clientId || new Date() > authCode.expires_at) {
//             throw new Error('invalid_grant');
//         }
//         if (redirectUri && authCode.redirect_uri !== redirectUri) {
//             throw new Error('redirect_uri_mismatch');
//         }
//         if (authCode.code_challenge_method !== 'S256') {
//             throw new Error('invalid_request: only S256 supported');
//         }
//         if (!this.verifyPkce(codeVerifier, authCode.code_challenge)) {
//             throw new Error('invalid_grant: PKCE verification failed');
//         }

//         await this.repo.markAuthCodeUsed(code);
//         const user = await this.repo.getUserByUid(authCode.user_uid);
//         if (!user) throw new Error('User not found');

//         const accessToken = await this.cryptoService.generateAccessToken(user, clientId, this.issuerUrl);
//         const idToken = authCode.scope.includes('openid') 
//             ? await this.cryptoService.generateIdToken(user, clientId, authCode.nonce, this.issuerUrl)
//             : undefined;

//         return {
//             access_token: accessToken,
//             token_type: 'Bearer',
//             expires_in: 3600,
//             id_token: idToken,
//             scope: authCode.scope
//         };
//     }

//     async createUser(adminUser: any, userData: any) {
//         if (adminUser.role !== 'admin') throw new Error('Forbidden');
        
//         const passwordHash = await bcrypt.hash(userData.password, 10);
//         return await this.repo.createUser({
//             username: userData.username,
//             email: userData.email,
//             password_hash: passwordHash,
//             role: userData.role || 'user',
//             first_name: userData.first_name || null,
//             last_name: userData.last_name || null,
//             enabled: true
//         });
//     }
// }