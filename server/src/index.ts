import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import inviteRoutes from './routes/invites';
import usersRoutes from './routes/users';
import { attachCollabHandlers } from './ws/collab';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => {
	res.json({ ok: true });
});

app.use('/auth', authRoutes);
app.use('/documents', documentRoutes);
app.use('/invites', inviteRoutes);
app.use('/users', usersRoutes);

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
attachCollabHandlers(wss);

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {
	console.log(`Server listening on http://localhost:${PORT}`);
});