import { Pool } from 'pg';

export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'stats',
    user: process.env.DB_USER || 'program',
    password: process.env.DB_PASSWORD || 'test',
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});