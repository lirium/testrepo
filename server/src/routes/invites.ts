import { Router } from 'express';
import { z } from 'zod';
import prisma from '../prisma';
import { requireAuth } from '../middleware/auth';
import type { AuthedRequest } from '../middleware/auth';

const router = Router();

router.post('/consume', requireAuth, async (req: AuthedRequest, res) => {
	const schema = z.object({ token: z.string() });
	const parsed = schema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
	const token = parsed.data.token as string;
	const link = await prisma.inviteLink.findUnique({ where: { token } });
	if (!link) return res.status(404).json({ error: 'Invalid link' });
	if (link.revokedAt) return res.status(410).json({ error: 'Link revoked' });
	if (link.expiresAt && link.expiresAt < new Date()) return res.status(410).json({ error: 'Link expired' });
	const permission = await prisma.permission.upsert({
		where: { userId_documentId: { userId: req.user!.userId, documentId: link.documentId } },
		update: { canView: link.canView, canEdit: link.canEdit, canPrint: link.canPrint, canCopy: link.canCopy },
		create: { userId: req.user!.userId, documentId: link.documentId, canView: link.canView, canEdit: link.canEdit, canPrint: link.canPrint, canCopy: link.canCopy },
	});
	res.json({ permission });
});

export default router;