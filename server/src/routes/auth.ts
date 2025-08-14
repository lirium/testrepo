import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { hashPassword, verifyPassword, signJwt } from '../utils/auth';

const router = Router();

const RegisterSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
	fullName: z.string().min(1),
});

router.post('/register', async (req, res) => {
	const parsed = RegisterSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
	const { email, password, fullName } = parsed.data;
	const exists = await prisma.user.findUnique({ where: { email } });
	if (exists) return res.status(409).json({ error: 'Email already registered' });
	const passwordHash = await hashPassword(password);
	const user = await prisma.user.create({ data: { email, passwordHash, fullName } });
	const token = signJwt({ userId: user.id, email: user.email });
	res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName } });
});

const LoginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
});

router.post('/login', async (req, res) => {
	const parsed = LoginSchema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
	const { email, password } = parsed.data;
	const user = await prisma.user.findUnique({ where: { email } });
	if (!user) return res.status(401).json({ error: 'Invalid credentials' });
	const ok = await verifyPassword(password, user.passwordHash);
	if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
	const token = signJwt({ userId: user.id, email: user.email });
	res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName } });
});

export default router;