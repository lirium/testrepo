import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

process.on('beforeExit', async () => {
	await prisma.$disconnect();
});

export default prisma;