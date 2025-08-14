import { Router } from 'express';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import prisma from '../prisma';

const router = Router();

router.get('/', requireAuth, async (req: AuthedRequest, res) => {
	const q = (req.query.q as string | undefined)?.trim();
	const where = q
		? {
			OR: [
				{ email: { contains: q, mode: 'insensitive' as const } },
				{ fullName: { contains: q, mode: 'insensitive' as const } },
			],
		}
		: undefined;
	const args: Parameters<typeof prisma.user.findMany>[0] = {
		select: { id: true, email: true, fullName: true },
		orderBy: { createdAt: 'desc' },
		take: 50,
	};
	if (where) (args as any).where = where;
	const users = await prisma.user.findMany(args);
	res.json({ users });
});

export default router;