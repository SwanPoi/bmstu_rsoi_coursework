import { Pool } from 'pg';

export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'program',
    password: process.env.DB_PASSWORD || 'test',
    database: process.env.DB_NAME || 'identity_db',
});
