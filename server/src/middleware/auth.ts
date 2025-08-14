import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/auth';

export interface AuthedRequest extends Request {
	user?: { userId: string; email: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({ error: 'Unauthorized' });
	}
	const token = authHeader.substring('Bearer '.length);
	const payload = verifyJwt(token);
	if (!payload) {
		return res.status(401).json({ error: 'Invalid token' });
	}
	req.user = { userId: payload.userId, email: payload.email };
	next();
}