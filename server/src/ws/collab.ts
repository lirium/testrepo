import { WebSocketServer } from 'ws';
import type { WebSocket } from 'ws';
import prisma from '../prisma';
import { verifyJwt } from '../utils/auth';

type ClientInfo = {
	socket: WebSocket;
	userId: string;
	documentId: string;
	canEdit: boolean;
};

const docIdToClients = new Map<string, Set<ClientInfo>>();

export function attachCollabHandlers(wss: WebSocketServer) {
	wss.on('connection', async (socket, req) => {
		try {
			const url = new URL(req.url || '', 'http://localhost');
			const token = url.searchParams.get('token') || '';
			const documentId = url.searchParams.get('documentId') || '';
			const payload = verifyJwt(token);
			if (!payload || !documentId) {
				socket.close();
				return;
			}
			const doc = await prisma.document.findUnique({ where: { id: documentId } });
			if (!doc) {
				socket.close();
				return;
			}
			const isOwner = doc.ownerId === payload.userId;
			const perm = await prisma.permission.findUnique({ where: { userId_documentId: { userId: payload.userId, documentId } } });
			const canView = isOwner || !!perm?.canView;
			const canEdit = isOwner || !!perm?.canEdit;
			if (!canView) {
				socket.close();
				return;
			}
			const info: ClientInfo = { socket, userId: payload.userId, documentId, canEdit };
			if (!docIdToClients.has(documentId)) docIdToClients.set(documentId, new Set());
			docIdToClients.get(documentId)!.add(info);

			socket.send(JSON.stringify({ type: 'init', content: JSON.parse(doc.content) }));

			socket.on('message', async (data) => {
				try {
					const msg = JSON.parse(String(data));
					if (msg.type === 'update') {
						if (!info.canEdit) return;
						const content = msg.content as Record<string, unknown>;
						const before = await prisma.document.findUnique({ where: { id: documentId } });
						await prisma.$transaction(async (tx) => {
							await tx.document.update({ where: { id: documentId }, data: { content: JSON.stringify(content) } });
							await tx.changeLog.create({ data: { documentId, userId: info.userId, changeType: 'ws_update', diff: JSON.stringify({ before: JSON.parse(before!.content), after: content }) } });
						});
						for (const client of docIdToClients.get(documentId) || []) {
							if (client.socket !== socket && client.socket.readyState === 1) {
								client.socket.send(JSON.stringify({ type: 'remote_update', content }));
							}
						}
					}
				} catch {}
			});

			socket.on('close', () => {
				docIdToClients.get(documentId)?.delete(info);
				if (docIdToClients.get(documentId)?.size === 0) docIdToClients.delete(documentId);
			});
		} catch {
			socket.close();
		}
	});
}