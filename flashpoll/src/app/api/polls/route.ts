import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CreatePollSchema = z.object({
	question: z.string().min(3).max(200),
	options: z.array(z.string().min(1).max(100)).min(2).max(6),
});

export async function GET() {
	const polls = await prisma.poll.findMany({
		orderBy: { createdAt: "desc" },
		take: 25,
		select: {
			id: true,
			question: true,
			createdAt: true,
			options: {
				select: { id: true, text: true },
			},
		},
	});
	return NextResponse.json({ polls });
}

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { question, options } = CreatePollSchema.parse(body);
		const created = await prisma.poll.create({
			data: {
				question,
				options: { create: options.map((text) => ({ text })) },
			},
			select: { id: true },
		});
		return NextResponse.json({ id: created.id }, { status: 201 });
	} catch {
		return NextResponse.json({ error: "Invalid request" }, { status: 400 });
	}
}