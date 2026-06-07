// import { Pool, QueryResult } from 'pg';
// import { User, AuthCode } from '../domain/models';

// export class IdpRepository {
//     private pool: Pool;

//     constructor() {
//         this.pool = new Pool({
//             host: process.env.DB_HOST || 'postgres',
//             port: parseInt(process.env.DB_PORT || '5432'),
//             user: process.env.DB_USER || 'program',
//             password: process.env.DB_PASSWORD || 'test',
//             database: process.env.DB_NAME || 'idp',
//         });
//     }

//     async getUserByUsername(username: string): Promise<User | undefined> {
//         const res = await this.pool.query('SELECT * FROM users WHERE username = $1', [username]);
//         return res.rows[0];
//     }

//     async getUserByUid(uid: string): Promise<User | undefined> {
//         const res = await this.pool.query('SELECT * FROM users WHERE user_uid = $1', [uid]);
//         return res.rows[0];
//     }

//     async createUser(user: Omit<User, 'user_uid'>): Promise<User> {
//         const res = await this.pool.query(
//             `INSERT INTO users (username, email, password_hash, role, first_name, last_name, enabled) 
//              VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
//             [user.username, user.email, user.password_hash, user.role, user.first_name, user.last_name, user.enabled]
//         );
//         return res.rows[0];
//     }

//     async createAuthCode(code: AuthCode): Promise<void> {
//         await this.pool.query(
//             `INSERT INTO auth_codes (code, user_uid, client_id, redirect_uri, scope, nonce, code_challenge, code_challenge_method, expires_at) 
//              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
//             [code.code, code.user_uid, code.client_id, code.redirect_uri, code.scope, code.nonce, code.code_challenge, code.code_challenge_method, code.expires_at]
//         );
//     }

//     async getAuthCode(code: string): Promise<AuthCode | undefined> {
//         const res = await this.pool.query('SELECT * FROM auth_codes WHERE code = $1 AND used = false', [code]);
//         return res.rows[0];
//     }

//     async markAuthCodeUsed(code: string): Promise<void> {
//         await this.pool.query('UPDATE auth_codes SET used = true WHERE code = $1', [code]);
//     }
// }