import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export async function hashPassword(plain: string): Promise<string> {
	const saltRounds = 10;
	return bcrypt.hash(plain, saltRounds);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
	return bcrypt.compare(plain, hash);
}

export const JwtPayloadSchema = z.object({
	userId: z.string(),
	email: z.string().email(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export function signJwt(payload: JwtPayload): string {
	return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyJwt(token: string): JwtPayload | null {
	try {
		const decoded = jwt.verify(token, JWT_SECRET) as unknown;
		return JwtPayloadSchema.parse(decoded);
	} catch {
		return null;
	}
}