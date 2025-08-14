"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const auth_1 = require("../utils/auth");
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring('Bearer '.length);
    const payload = (0, auth_1.verifyJwt)(token);
    if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = { userId: payload.userId, email: payload.email };
    next();
}
//# sourceMappingURL=auth.js.map