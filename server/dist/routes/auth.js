"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../prisma"));
const auth_1 = require("../utils/auth");
const router = (0, express_1.Router)();
const RegisterSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
    fullName: zod_1.z.string().min(1),
});
router.post('/register', async (req, res) => {
    const parsed = RegisterSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { email, password, fullName } = parsed.data;
    const exists = await prisma_1.default.user.findUnique({ where: { email } });
    if (exists)
        return res.status(409).json({ error: 'Email already registered' });
    const passwordHash = await (0, auth_1.hashPassword)(password);
    const user = await prisma_1.default.user.create({ data: { email, passwordHash, fullName } });
    const token = (0, auth_1.signJwt)({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName } });
});
const LoginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
router.post('/login', async (req, res) => {
    const parsed = LoginSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: parsed.error.flatten() });
    const { email, password } = parsed.data;
    const user = await prisma_1.default.user.findUnique({ where: { email } });
    if (!user)
        return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await (0, auth_1.verifyPassword)(password, user.passwordHash);
    if (!ok)
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = (0, auth_1.signJwt)({ userId: user.id, email: user.email });
    res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName } });
});
exports.default = router;
//# sourceMappingURL=auth.js.map