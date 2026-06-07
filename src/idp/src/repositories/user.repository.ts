import { pool } from '../config/db';
import { v4 as uuidv4 } from 'uuid';

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  email: string;
  roles: string[];
}

export class UserRepository {
    async findByUsername(username: string): Promise<UserRow | null> {
        const res = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        return res.rows[0] || null;
    }

    async createUser(username: string, passwordHash: string, email: string, roles: string[]): Promise<UserRow> {
        const id = uuidv4();
        const res = await pool.query(
            'INSERT INTO users (id, username, password_hash, email, roles) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [id, username, passwordHash, email, roles]
        );
        return res.rows[0];
    }
}