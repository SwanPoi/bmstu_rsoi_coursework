import { pool } from '../config/db';

export interface AuthCodeRow {
    code: string;
    user_id: string;
    client_id: string;
    redirect_uri: string;
    scope: string;
    expires_at: Date;
}

export interface RefreshTokenRow {
    token: string;
    user_id: string;
    client_id: string;
    expires_at: Date;
}

export class AuthRepository {
    async saveCode(code: string, userId: string, clientId: string, redirectUri: string, scope: string, expiresAt: Date, state: string): Promise<void> {
        await pool.query(
        'INSERT INTO auth_codes (code, user_id, client_id, redirect_uri, scope, expires_at, state) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [code, userId, clientId, redirectUri, scope, expiresAt, state]
        );
    }

    async findAndUseCode(code: string): Promise<AuthCodeRow | null> {
        const res = await pool.query('DELETE FROM auth_codes WHERE code = $1 RETURNING *', [code]);
        return res.rows[0] || null;
    }

    async saveRefreshToken(token: string, userId: string, clientId: string, expiresAt: Date): Promise<void> {
        await pool.query(
            'INSERT INTO refresh_tokens (token, user_id, client_id, expires_at) VALUES ($1, $2, $3, $4)',
            [token, userId, clientId, expiresAt]
        );
    }

    async findRefreshToken(token: string): Promise<RefreshTokenRow | null> {
        const res = await pool.query('SELECT * FROM refresh_tokens WHERE token = $1', [token]);
        return res.rows[0] || null;
    }

    async deleteRefreshToken(token: string): Promise<void> {
        await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
    }
}