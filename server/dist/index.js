"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const ws_1 = require("ws");
const auth_1 = __importDefault(require("./routes/auth"));
const documents_1 = __importDefault(require("./routes/documents"));
const invites_1 = __importDefault(require("./routes/invites"));
const users_1 = __importDefault(require("./routes/users"));
const collab_1 = require("./ws/collab");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '2mb' }));
app.get('/health', (_req, res) => {
    res.json({ ok: true });
});
app.use('/auth', auth_1.default);
app.use('/documents', documents_1.default);
app.use('/invites', invites_1.default);
app.use('/users', users_1.default);
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ server, path: '/ws' });
(0, collab_1.attachCollabHandlers)(wss);
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map