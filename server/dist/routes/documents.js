"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../prisma"));
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
const JsonRecordSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.any());
// Create document
router.post('/', auth_1.requireAuth, async (req, res) => {
    const schema = zod_1.z.object({ title: zod_1.z.string().min(1), content: JsonRecordSchema.optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { title, content } = parsed.data;
    const doc = await prisma_1.default.document.create({
        data: {
            title,
            content: JSON.stringify(content ?? {}),
            ownerId: req.user.userId,
        },
    });
    res.json({ document: doc });
});
// List my documents (owned or with permissions)
router.get('/', auth_1.requireAuth, async (req, res) => {
    const userId = req.user.userId;
    const owned = await prisma_1.default.document.findMany({ where: { ownerId: userId } });
    const sharedPerms = await prisma_1.default.permission.findMany({ where: { userId }, include: { document: true } });
    const shared = sharedPerms.map((p) => p.document);
    res.json({ owned, shared });
});
// Get single document with permissions
router.get('/:id', auth_1.requireAuth, async (req, res) => {
    const userId = req.user.userId;
    const id = req.params.id;
    const doc = await prisma_1.default.document.findUnique({ where: { id } });
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    const isOwner = doc.ownerId === userId;
    const perm = await prisma_1.default.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
    const canView = isOwner || !!perm?.canView;
    if (!canView)
        return res.status(403).json({ error: 'No access' });
    res.json({ document: doc, permissions: { isOwner, canView, canEdit: isOwner || !!perm?.canEdit, canPrint: isOwner || !!perm?.canPrint, canCopy: isOwner || !!perm?.canCopy } });
});
// Update document content (records change)
router.put('/:id', auth_1.requireAuth, async (req, res) => {
    const schema = zod_1.z.object({ content: JsonRecordSchema });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { content } = parsed.data;
    const userId = req.user.userId;
    const id = req.params.id;
    const doc = await prisma_1.default.document.findUnique({ where: { id } });
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    const isOwner = doc.ownerId === userId;
    const perm = await prisma_1.default.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
    const canEdit = isOwner || !!perm?.canEdit;
    if (!canEdit)
        return res.status(403).json({ error: 'No edit rights' });
    await prisma_1.default.$transaction(async (tx) => {
        const updated = await tx.document.update({ where: { id }, data: { content: JSON.stringify(content) } });
        await tx.changeLog.create({ data: { documentId: id, userId, changeType: 'update', diff: JSON.stringify({ before: JSON.parse(doc.content), after: content }) } });
        res.json({ document: updated });
    });
});
// Create snapshot
router.post('/:id/snapshots', auth_1.requireAuth, async (req, res) => {
    const schema = zod_1.z.object({ label: zod_1.z.string().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const id = req.params.id;
    const { label } = parsed.data;
    const doc = await prisma_1.default.document.findUnique({ where: { id } });
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    const userId = req.user.userId;
    const isOwner = doc.ownerId === userId;
    const perm = await prisma_1.default.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
    if (!(isOwner || perm?.canEdit || perm?.canView))
        return res.status(403).json({ error: 'No access' });
    const snap = await prisma_1.default.snapshot.create({ data: { documentId: id, content: doc.content, label: label ?? null } });
    res.json({ snapshot: snap });
});
// List change history
router.get('/:id/history', auth_1.requireAuth, async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    const doc = await prisma_1.default.document.findUnique({ where: { id } });
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    const isOwner = doc.ownerId === userId;
    const perm = await prisma_1.default.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
    if (!(isOwner || perm?.canView))
        return res.status(403).json({ error: 'No access' });
    const changes = await prisma_1.default.changeLog.findMany({ where: { documentId: id }, orderBy: { createdAt: 'desc' } });
    res.json({ history: changes });
});
// Revert to a change
router.post('/:id/revert/:changeId', auth_1.requireAuth, async (req, res) => {
    const id = req.params.id;
    const changeId = req.params.changeId;
    const userId = req.user.userId;
    const doc = await prisma_1.default.document.findUnique({ where: { id } });
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    const isOwner = doc.ownerId === userId;
    const perm = await prisma_1.default.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
    if (!(isOwner || perm?.canEdit))
        return res.status(403).json({ error: 'No edit rights' });
    const change = await prisma_1.default.changeLog.findUnique({ where: { id: changeId } });
    if (!change || change.documentId !== id)
        return res.status(404).json({ error: 'Change not found' });
    const parsed = JSON.parse(change.diff);
    const before = parsed.before ?? {};
    await prisma_1.default.$transaction(async (tx) => {
        const updated = await tx.document.update({ where: { id }, data: { content: JSON.stringify(before) } });
        await tx.changeLog.create({ data: { documentId: id, userId, changeType: 'revert', diff: JSON.stringify({ from: JSON.parse(doc.content), to: before, basedOn: changeId }) } });
        res.json({ document: updated });
    });
});
// Export content (requires canCopy)
router.get('/:id/export', auth_1.requireAuth, async (req, res) => {
    const id = req.params.id;
    const userId = req.user.userId;
    const doc = await prisma_1.default.document.findUnique({ where: { id } });
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    const isOwner = doc.ownerId === userId;
    const perm = await prisma_1.default.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
    if (!(isOwner || perm?.canCopy))
        return res.status(403).json({ error: 'No copy rights' });
    res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/[^a-z0-9-_]/gi, '_')}.json"`);
    res.json(JSON.parse(doc.content));
});
// Print view (requires canPrint). Accepts token query alternative for auth in new window
router.get('/:id/print', async (req, res) => {
    try {
        let userId = null;
        const token = req.query.token || (req.headers.authorization?.toString().startsWith('Bearer ') ? req.headers.authorization.toString().substring('Bearer '.length) : undefined);
        if (token) {
            // lazy import to avoid circular
            const { verifyJwt } = await Promise.resolve().then(() => __importStar(require('../utils/auth')));
            const payload = verifyJwt(token);
            if (payload)
                userId = payload.userId;
        }
        if (!userId)
            return res.status(401).send('Unauthorized');
        const id = req.params.id;
        const doc = await prisma_1.default.document.findUnique({ where: { id } });
        if (!doc)
            return res.status(404).send('Not found');
        const isOwner = doc.ownerId === userId;
        const perm = await prisma_1.default.permission.findUnique({ where: { userId_documentId: { userId, documentId: id } } });
        if (!(isOwner || perm?.canPrint))
            return res.status(403).send('No print rights');
        const content = JSON.parse(doc.content);
        const html = `<!doctype html><html><head><meta charset="utf-8" /><title>${doc.title}</title><style>body{font-family:sans-serif;margin:24px} table{border-collapse:collapse} td,th{border:1px solid #ccc;padding:6px 10px}</style></head><body><h1>${doc.title}</h1>${renderTable(content)}<script>window.onload=()=>window.print();</script></body></html>`;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    }
    catch (e) {
        res.status(500).send('Error');
    }
});
function renderTable(content) {
    const rows = content?.rows || [];
    if (!Array.isArray(rows) || rows.length === 0)
        return '<p>(Пусто)</p>';
    const cols = Object.keys(rows[0]);
    return `<table><thead><tr>${cols.map(c => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${escapeHtml(r[c] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[m] || m)); }
// Manage user permissions (owner only)
router.post('/:id/permissions', auth_1.requireAuth, async (req, res) => {
    const schema = zod_1.z.object({ userId: zod_1.z.string(), canView: zod_1.z.boolean().optional(), canEdit: zod_1.z.boolean().optional(), canPrint: zod_1.z.boolean().optional(), canCopy: zod_1.z.boolean().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const id = req.params.id;
    const doc = await prisma_1.default.document.findUnique({ where: { id } });
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    if (doc.ownerId !== req.user.userId)
        return res.status(403).json({ error: 'Only owner' });
    const { userId, canView = true, canEdit = false, canPrint = false, canCopy = false } = parsed.data;
    const perm = await prisma_1.default.permission.upsert({
        where: { userId_documentId: { userId, documentId: id } },
        update: { canView, canEdit, canPrint, canCopy },
        create: { userId, documentId: id, canView, canEdit, canPrint, canCopy },
    });
    res.json({ permission: perm });
});
// Create invite link (owner)
router.post('/:id/invite-links', auth_1.requireAuth, async (req, res) => {
    const schema = zod_1.z.object({ canView: zod_1.z.boolean().optional(), canEdit: zod_1.z.boolean().optional(), canPrint: zod_1.z.boolean().optional(), canCopy: zod_1.z.boolean().optional(), expiresAt: zod_1.z.string().datetime().optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const id = req.params.id;
    const doc = await prisma_1.default.document.findUnique({ where: { id } });
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    if (doc.ownerId !== req.user.userId)
        return res.status(403).json({ error: 'Only owner' });
    const token = (0, crypto_1.randomUUID)();
    const { canView = true, canEdit = false, canPrint = false, canCopy = false, expiresAt } = parsed.data;
    const link = await prisma_1.default.inviteLink.create({ data: { token, documentId: id, creatorId: req.user.userId, canView, canEdit, canPrint, canCopy, expiresAt: expiresAt ? new Date(expiresAt) : null } });
    res.json({ inviteLink: link, url: `${process.env.PUBLIC_URL || 'http://localhost:5173'}/invite/${token}` });
});
// Revoke invite link
router.post('/:id/invite-links/:token/revoke', auth_1.requireAuth, async (req, res) => {
    const id = req.params.id;
    const token = req.params.token;
    const doc = await prisma_1.default.document.findUnique({ where: { id } });
    if (!doc)
        return res.status(404).json({ error: 'Not found' });
    if (doc.ownerId !== req.user.userId)
        return res.status(403).json({ error: 'Only owner' });
    const link = await prisma_1.default.inviteLink.findUnique({ where: { token } });
    if (!link)
        return res.status(404).json({ error: 'Not found' });
    const revoked = await prisma_1.default.inviteLink.update({ where: { id: link.id }, data: { revokedAt: new Date() } });
    res.json({ inviteLink: revoked });
});
exports.default = router;
//# sourceMappingURL=documents.js.map