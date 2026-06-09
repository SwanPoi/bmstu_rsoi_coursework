import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

export class CryptoService {
    private privateKey: string;
    private publicKey: string;
    private kid: string = 'key-id-rsoi-2026';

    constructor() {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        this.privateKey = privateKey;
        this.publicKey = publicKey;
    }

    getKid() { return this.kid; }

    getJwks() {
        const pubKeyObj = crypto.createPublicKey(this.publicKey);
        const jwk = pubKeyObj.export({ format: 'jwk' }) as any;
        
        return {
            keys: [
                {
                kty: 'RSA',
                alg: 'RS256',
                use: 'sig',
                kid: this.kid,
                n: jwk.n,
                e: jwk.e,
                },
            ],
        };
    }

    generateJwt(payload: object, subject: string, audience: string): string {
        return jwt.sign(payload, this.privateKey, {
            algorithm: 'RS256',
            expiresIn: '1h',
            keyid: this.kid,
            subject: subject,
            issuer: process.env.ISSUER_URL || 'http://idp-svc:8090',
            audience: audience
        });
    }

    verifyJwt(token: string): any {
        return jwt.verify(token, this.privateKey, { algorithms: ['RS256'] });
    }

    verifyToken(token: string): any {
        return jwt.verify(token, this.publicKey, {
            algorithms: ['RS256'],
            issuer: process.env.ISSUER_URL,
        });
    }
}