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

// import { Request, Response, NextFunction } from 'express';
// import { jwtVerify, createRemoteJWKSet } from 'jose';

// export const requireAdmin = (issuerUrl: string) => {
//     // В реальном проде лучше кэшировать JWKS, здесь упрощенно
//     const JWKS = createRemoteJWKSet(new URL(issuerUrl + '/.well-known/jwks.json'));

//     return async (req: Request, res: Response, next: NextFunction) => {
//         const authHeader = req.headers.authorization;
//         if (!authHeader?.startsWith('Bearer ')) {
//             return res.status(401).json({ message: 'Token required' });
//         }

//         try {
//             const { payload } = await jwtVerify(authHeader.split(' ')[1], JWKS, {
//                 issuer: issuerUrl,
//             });

//             if (payload.role !== 'admin') {
//                 return res.status(403).json({ message: 'Admin role required' });
//             }

//             (req as any).user = payload;
//             next();
//         } catch (err) {
//             return res.status(401).json({ message: 'Invalid or expired token' });
//         }
//     };
// };