"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtPayloadSchema = void 0;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.signJwt = signJwt;
exports.verifyJwt = verifyJwt;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
async function hashPassword(plain) {
    const saltRounds = 10;
    return bcrypt_1.default.hash(plain, saltRounds);
}
async function verifyPassword(plain, hash) {
    return bcrypt_1.default.compare(plain, hash);
}
exports.JwtPayloadSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    email: zod_1.z.string().email(),
});
function signJwt(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
function verifyJwt(token) {
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return exports.JwtPayloadSchema.parse(decoded);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=auth.js.map