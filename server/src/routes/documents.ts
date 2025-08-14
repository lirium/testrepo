import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, AuthedRequest } from '../middleware/auth';
import prisma from '../prisma';
import { randomUUID } from 'crypto';

const router = Router();

const JsonRecordSchema = z.record(z.string(), z.any());

// Create document
router.post('/', requireAuth, async (req: AuthedRequest, res) => {
	const schema = z.object({ title: z.string().min(1), content: JsonRecordSchema.optional() });
	const parsed = schema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
	const { title, content } = parsed.data;
	const doc = await prisma.document.create({
		data: {
			title,
			content: JSON.stringify(content ?? {}),
			ownerId: req.user!.userId,
		},
	});
	res.json({ document: doc });
});

// List my documents (owned or with permissions)
router.get('/', requireAuth, async (req: AuthedRequest, res) => {
	const userId = req.user!.userId;
	const owned = await prisma.document.findMany({ where: { ownerId: userId } });
	const sharedPerms = await prisma.permission.findMany({ where: { userId }, include: { document: true } });
	const shared = sharedPerms.map((p) => p.document);
	res.json({ owned, shared });
});

// Get single document with permissions
router.get('/:id', requireAuth, async (req: AuthedRequest, res) => {
	const userId = req.user!.userId;
	const id = req.params.id as string;
	const doc = await prisma.document.findUnique({ where: { id } });
	if (!doc) return res.status(404).json({ error: 'Not found' });
	const isOwner = doc.ownerId === userId;
	const perm = await prisma.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
	const canView = isOwner || !!perm?.canView;
	if (!canView) return res.status(403).json({ error: 'No access' });
	res.json({ document: doc, permissions: { isOwner, canView, canEdit: isOwner || !!perm?.canEdit, canPrint: isOwner || !!perm?.canPrint, canCopy: isOwner || !!perm?.canCopy } });
});

// Update document content (records change)
router.put('/:id', requireAuth, async (req: AuthedRequest, res) => {
	const schema = z.object({ content: JsonRecordSchema });
	const parsed = schema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
	const { content } = parsed.data;
	const userId = req.user!.userId;
	const id = req.params.id as string;
	const doc = await prisma.document.findUnique({ where: { id } });
	if (!doc) return res.status(404).json({ error: 'Not found' });
	const isOwner = doc.ownerId === userId;
	const perm = await prisma.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
	const canEdit = isOwner || !!perm?.canEdit;
	if (!canEdit) return res.status(403).json({ error: 'No edit rights' });

	await prisma.$transaction(async (tx) => {
		const updated = await tx.document.update({ where: { id }, data: { content: JSON.stringify(content) } });
		await tx.changeLog.create({ data: { documentId: id, userId, changeType: 'update', diff: JSON.stringify({ before: JSON.parse(doc.content), after: content }) } });
		res.json({ document: updated });
	});
});

// Create snapshot
router.post('/:id/snapshots', requireAuth, async (req: AuthedRequest, res) => {
	const schema = z.object({ label: z.string().optional() });
	const parsed = schema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
	const id = req.params.id as string; const { label } = parsed.data;
	const doc = await prisma.document.findUnique({ where: { id } });
	if (!doc) return res.status(404).json({ error: 'Not found' });
	const userId = req.user!.userId;
	const isOwner = doc.ownerId === userId;
	const perm = await prisma.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
	if (!(isOwner || perm?.canEdit || perm?.canView)) return res.status(403).json({ error: 'No access' });
	const snap = await prisma.snapshot.create({ data: { documentId: id, content: doc.content, label: label ?? null } });
	res.json({ snapshot: snap });
});

// List change history
router.get('/:id/history', requireAuth, async (req: AuthedRequest, res) => {
	const id = req.params.id as string;
	const userId = req.user!.userId;
	const doc = await prisma.document.findUnique({ where: { id } });
	if (!doc) return res.status(404).json({ error: 'Not found' });
	const isOwner = doc.ownerId === userId;
	const perm = await prisma.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
	if (!(isOwner || perm?.canView)) return res.status(403).json({ error: 'No access' });
	const changes = await prisma.changeLog.findMany({ where: { documentId: id }, orderBy: { createdAt: 'desc' } });
	res.json({ history: changes });
});

// Revert to a change
router.post('/:id/revert/:changeId', requireAuth, async (req: AuthedRequest, res) => {
	const id = req.params.id as string;
	const changeId = req.params.changeId as string;
	const userId = req.user!.userId;
	const doc = await prisma.document.findUnique({ where: { id } });
	if (!doc) return res.status(404).json({ error: 'Not found' });
	const isOwner = doc.ownerId === userId;
	const perm = await prisma.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
	if (!(isOwner || perm?.canEdit)) return res.status(403).json({ error: 'No edit rights' });
	const change = await prisma.changeLog.findUnique({ where: { id: changeId } });
	if (!change || change.documentId !== id) return res.status(404).json({ error: 'Change not found' });
	const parsed = JSON.parse(change.diff);
	const before = parsed.before ?? {};
	await prisma.$transaction(async (tx) => {
		const updated = await tx.document.update({ where: { id }, data: { content: JSON.stringify(before) } });
		await tx.changeLog.create({ data: { documentId: id, userId, changeType: 'revert', diff: JSON.stringify({ from: JSON.parse(doc.content), to: before, basedOn: changeId }) } });
		res.json({ document: updated });
	});
});

// Export content (requires canCopy)
router.get('/:id/export', requireAuth, async (req: AuthedRequest, res) => {
	const id = req.params.id as string;
	const userId = req.user!.userId;
	const doc = await prisma.document.findUnique({ where: { id } });
	if (!doc) return res.status(404).json({ error: 'Not found' });
	const isOwner = doc.ownerId === userId;
	const perm = await prisma.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
	if (!(isOwner || perm?.canCopy)) return res.status(403).json({ error: 'No copy rights' });
	res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/[^a-z0-9-_]/gi,'_')}.json"`);
	res.json(JSON.parse(doc.content));
});

// Print view (requires canPrint). Accepts token query alternative for auth in new window
router.get('/:id/print', async (req, res) => {
	try {
		let userId: string | null = null;
		const token = (req.query.token as string | undefined) || (req.headers.authorization?.toString().startsWith('Bearer ') ? req.headers.authorization.toString().substring('Bearer '.length) : undefined);
		if (token) {
			// lazy import to avoid circular
			const { verifyJwt } = await import('../utils/auth');
			const payload = verifyJwt(token);
			if (payload) userId = payload.userId;
		}
		if (!userId) return res.status(401).send('Unauthorized');
		const id = req.params.id as string;
		const doc = await prisma.document.findUnique({ where: { id } });
		if (!doc) return res.status(404).send('Not found');
		const isOwner = doc.ownerId === userId;
		const perm = await prisma.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
		if (!(isOwner || perm?.canPrint)) return res.status(403).send('No print rights');
		const content = JSON.parse(doc.content);
		const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${doc.title}</title><style>body{font-family:sans-serif;margin:24px} table{border-collapse:collapse} td,th{border:1px solid #ccc;padding:6px 10px}</style></head><body><h1>${doc.title}</h1>${renderTable(content)}<script>window.onload=()=>window.print();</script></body></html>`;
		res.setHeader('Content-Type', 'text/html; charset=utf-8');
		res.send(html);
	} catch (e) {
		res.status(500).send('Error');
	}
});

function renderTable(content: any): string {
	const rows: any[] = content?.rows || [];
	if (!Array.isArray(rows) || rows.length === 0) return '<p>(Пусто)</p>';
	const cols = Object.keys(rows[0]);
	return `<table><thead><tr>${cols.map(c=>`<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${escapeHtml(r[c]??'')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

function escapeHtml(s: any): string { return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'} as any)[m] || m); }

// Manage user permissions (owner only)
router.post('/:id/permissions', requireAuth, async (req: AuthedRequest, res) => {
	const schema = z.object({ userId: z.string(), canView: z.boolean().optional(), canEdit: z.boolean().optional(), canPrint: z.boolean().optional(), canCopy: z.boolean().optional() });
	const parsed = schema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
	const id = req.params.id as string;
	const doc = await prisma.document.findUnique({ where: { id } });
	if (!doc) return res.status(404).json({ error: 'Not found' });
	if (doc.ownerId !== req.user!.userId) return res.status(403).json({ error: 'Only owner' });
	const { userId, canView = true, canEdit = false, canPrint = false, canCopy = false } = parsed.data;
	const perm = await prisma.permission.upsert({
		where: { userId_documentId: { userId, documentId: id } },
		update: { canView, canEdit, canPrint, canCopy },
		create: { userId, documentId: id, canView, canEdit, canPrint, canCopy },
	});
	res.json({ permission: perm });
});

// Create invite link (owner)
router.post('/:id/invite-links', requireAuth, async (req: AuthedRequest, res) => {
	const schema = z.object({ canView: z.boolean().optional(), canEdit: z.boolean().optional(), canPrint: z.boolean().optional(), canCopy: z.boolean().optional(), expiresAt: z.string().datetime().optional() });
	const parsed = schema.safeParse(req.body);
	if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
	const id = req.params.id as string;
	const doc = await prisma.document.findUnique({ where: { id } });
	if (!doc) return res.status(404).json({ error: 'Not found' });
	if (doc.ownerId !== req.user!.userId) return res.status(403).json({ error: 'Only owner' });
	const token = randomUUID();
	const { canView = true, canEdit = false, canPrint = false, canCopy = false, expiresAt } = parsed.data;
	const link = await prisma.inviteLink.create({ data: { token, documentId: id, creatorId: req.user!.userId, canView, canEdit, canPrint, canCopy, expiresAt: expiresAt ? new Date(expiresAt) : null } });
	res.json({ inviteLink: link, url: `${process.env.PUBLIC_URL || 'http://localhost:5173'}/invite/${token}` });
});

// Revoke invite link
router.post('/:id/invite-links/:token/revoke', requireAuth, async (req: AuthedRequest, res) => {
	const id = req.params.id as string;
	const token = req.params.token as string;
	const doc = await prisma.document.findUnique({ where: { id } });
	if (!doc) return res.status(404).json({ error: 'Not found' });
	if (doc.ownerId !== req.user!.userId) return res.status(403).json({ error: 'Only owner' });
	const link = await prisma.inviteLink.findUnique({ where: { token } });
	if (!link) return res.status(404).json({ error: 'Not found' });
	const revoked = await prisma.inviteLink.update({ where: { id: link.id }, data: { revokedAt: new Date() } });
	res.json({ inviteLink: revoked });
});

export default router;