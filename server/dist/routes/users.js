"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const prisma_1 = __importDefault(require("../prisma"));
const router = (0, express_1.Router)();
router.get('/', auth_1.requireAuth, async (req, res) => {
    const q = req.query.q?.trim();
    const where = q
        ? {
            OR: [
                { email: { contains: q, mode: 'insensitive' } },
                { fullName: { contains: q, mode: 'insensitive' } },
            ],
        }
        : undefined;
    const args = {
        select: { id: true, email: true, fullName: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
    };
    if (where)
        args.where = where;
    const users = await prisma_1.default.user.findMany(args);
    res.json({ users });
});
exports.default = router;
//# sourceMappingURL=users.js.map