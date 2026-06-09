import { pool } from '../config/db';

export interface RentalEvent {
  rental_uid: string;
  username: string;
  car_uid: string;
  date_from: string;
  date_to: string;
  status: string;
  payment_uid: string;
}

export interface PaymentEvent {
  payment_uid: string;
  status: string;
  price: number;
}

export interface CarEvent {
  car_uid: string;
  brand: string;
  model: string;
  type: string;
  price: number;
  action: string;
}

export interface UserEvent {
  username: string;
  action: string;
}

export class StatsRepository {
  async saveRentalEvent(event: RentalEvent): Promise<void> {
    await pool.query(
      `INSERT INTO rental_stats (rental_uid, username, car_uid, date_from, date_to, status, payment_uid, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) 
       ON CONFLICT (rental_uid) DO UPDATE SET 
          status = EXCLUDED.status, 
          username = EXCLUDED.username, 
          car_uid = EXCLUDED.car_uid, 
          date_from = EXCLUDED.date_from, 
          date_to = EXCLUDED.date_to, 
          payment_uid = EXCLUDED.payment_uid, 
          updated_at = NOW()`,
      [event.rental_uid, event.username, event.car_uid, event.date_from, event.date_to, event.status, event.payment_uid]
    );
  }

  async savePaymentEvent(event: PaymentEvent): Promise<void> {
    await pool.query(
      `INSERT INTO payment_stats (payment_uid, status, price, created_at) 
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (payment_uid) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          price = EXCLUDED.price,
          updated_at = NOW()`,
      [event.payment_uid, event.status, event.price]
    );
  }

  async saveCarEvent(event: CarEvent): Promise<void> {
    await pool.query(
      `INSERT INTO car_stats (car_uid, brand, model, type, price, action, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [event.car_uid, event.brand, event.model, event.type, event.price, event.action]
    );
  }

  async saveUserEvent(event: UserEvent): Promise<void> {
    await pool.query(
      `INSERT INTO user_stats (username, action, created_at) 
       VALUES ($1, $2, NOW())`,
      [event.username, event.action]
    );
  }

  async getRentalStats(dateFrom?: string, dateTo?: string) {
    let query = `
      SELECT 
        COUNT(*) as total_rentals,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as active_rentals,
        COUNT(CASE WHEN status = 'FINISHED' THEN 1 END) as finished_rentals,
        COUNT(CASE WHEN status = 'CANCELED' THEN 1 END) as canceled_rentals
      FROM rental_stats
    `;
    
    const params: any[] = [];
    if (dateFrom && dateTo) {
      query += ` WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp + interval '1 day'`;
      params.push(dateFrom, dateTo);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

  async getPaymentStats(dateFrom?: string, dateTo?: string) {
    let query = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid_payments,
        COUNT(CASE WHEN status = 'CANCELED' THEN 1 END) as canceled_payments,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN price ELSE 0 END), 0) as total_paid,
        COALESCE(AVG(CASE WHEN status = 'PAID' THEN price END), 0) as avg_payment
      FROM payment_stats
    `;
    
    const params: any[] = [];
    if (dateFrom && dateTo) {
      query += ` WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp + interval '1 day'`;
      params.push(dateFrom, dateTo);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }

    async getCarStats(dateFrom?: string, dateTo?: string) {
        let query = `
        SELECT 
            type,
            COUNT(*) as total_cars,
            COUNT(CASE WHEN action = 'rented' THEN 1 END) as rented_count,
            AVG(price) as avg_price
        FROM car_stats
        `;
        
        const params: any[] = [];
        if (dateFrom && dateTo) {
            query += ` WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp + interval '1 day'`;
            params.push(dateFrom, dateTo);
        }

        query += ` GROUP BY type`;

        const result = await pool.query(query, params);
        return result.rows;
    }

  async getUserStats(dateFrom?: string, dateTo?: string) {
    let query = `
      SELECT 
        username,
        COUNT(*) as total_actions,
        COUNT(CASE WHEN action = 'login' THEN 1 END) as login_count,
        COUNT(CASE WHEN action = 'registered' THEN 1 END) as registration_count
      FROM user_stats
    `;
    
    const params: any[] = [];
    if (dateFrom && dateTo) {
      query += ` WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp + interval '1 day'`;
      params.push(dateFrom, dateTo);
    }

    query += ` GROUP BY username ORDER BY total_actions DESC LIMIT 100`;

    const result = await pool.query(query, params);
    return result.rows;
  }
}