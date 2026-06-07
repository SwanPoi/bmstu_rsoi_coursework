import { pool } from '../config/db';

export interface ClientRow {
    client_id: string;
    client_secret: string;
    redirect_uri: string;
    client_name: string;
}

export class ClientRepository {
    async findById(clientId: string): Promise<ClientRow | null> {
        const res = await pool.query('SELECT * FROM oauth_clients WHERE client_id = $1', [clientId]);
        return res.rows[0] || null;
    }
}