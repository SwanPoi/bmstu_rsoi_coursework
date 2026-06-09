import { Request, Response, NextFunction } from 'express';
import { CryptoService } from '../services/crypto.service';

export const createAdminCheckMiddleware = (cryptoService: CryptoService) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: Missing token' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const decoded = cryptoService.verifyJwt(token);
            if (!decoded.roles || !decoded.roles.includes('Admin')) {
                return res.status(403).json({ error: 'Forbidden: Admin role required' });
            }
            req.body.currentUser = decoded;
            return next();
        } catch (err) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    };
};