import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
    jwksUri: `${process.env.ISSUER_URL}/.well-known/jwks.json`,
});

function getKey(header: any, callback: any) {
    client.getSigningKey(header.kid, (err, key) => {
        const signingKey = key?.getPublicKey();
        callback(err, signingKey);
    });
}

export function createAdminCheckMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token required' });
        }

        const token = authHeader.substring(7);

        jwt.verify(
            token,
            getKey,
            {
                algorithms: ['RS256'],
                issuer: process.env.ISSUER_URL,
            },
            (err: any, decoded: any) => {
                if (err) {
                    return res.status(401).json({ error: 'Invalid or expired token' });
                }

                if (!decoded.roles || !decoded.roles.includes('Admin')) {
                    return res.status(403).json({ error: 'Admin role required' });
                }

                (req as any).user = decoded;
                next();
            }
        );
    };
}