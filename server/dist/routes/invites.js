"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/consume', auth_1.requireAuth, async (req, res) => {
    const schema = zod_1.z.object({ token: zod_1.z.string() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const token = parsed.data.token;
    const link = await prisma_1.default.inviteLink.findUnique({ where: { token } });
    if (!link)
        return res.status(404).json({ error: 'Invalid link' });
    if (link.revokedAt)
        return res.status(410).json({ error: 'Link revoked' });
    if (link.expiresAt && link.expiresAt < new Date())
        return res.status(410).json({ error: 'Link expired' });
    const permission = await prisma_1.default.permission.upsert({
        where: { userId_documentId: { userId: req.user.userId, documentId: link.documentId } },
        update: { canView: link.canView, canEdit: link.canEdit, canPrint: link.canPrint, canCopy: link.canCopy },
        create: { userId: req.user.userId, documentId: link.documentId, canView: link.canView, canEdit: link.canEdit, canPrint: link.canPrint, canCopy: link.canCopy },
    });
    res.json({ permission });
});
exports.default = router;
//# sourceMappingURL=invites.js.map