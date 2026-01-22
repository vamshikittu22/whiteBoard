import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth.js';

export interface AuthRequest extends Request {
    userId?: string;
    userEmail?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.substring(7);
        const payload = verifyAccessToken(token);

        req.userId = payload.userId;
        req.userEmail = payload.email;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
