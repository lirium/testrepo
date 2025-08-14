/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
	_request: Request,
	{ params }: any
) {
	const poll = await prisma.poll.findUnique({
		where: { id: params.id },
		select: {
			id: true,
			question: true,
			createdAt: true,
			options: {
				select: {
					id: true,
					text: true,
					_count: { select: { votes: true } },
				},
			},
		},
	});
	if (!poll) return NextResponse.json({ error: "Not found" }, { status: 404 });
	const options = poll.options.map((o) => ({ id: o.id, text: o.text, votes: o._count.votes }));
	return NextResponse.json({ ...poll, options });
}