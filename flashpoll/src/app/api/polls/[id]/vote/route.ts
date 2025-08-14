/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VoteSchema = z.object({ optionId: z.string().min(1) });

function getVoterId(req: NextRequest): string {
	const header = req.headers.get("x-fp") || req.cookies.get("fp")?.value;
	const ipLike =
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
		req.headers.get("x-real-ip") ||
		"0";
	return header || "anon:" + ipLike + ":" + Date.now().toString(36);
}

export async function POST(
	req: NextRequest,
	{ params }: any
) {
	try {
		const { optionId } = VoteSchema.parse(await req.json());
		const pollId = params.id;
		const voterId = getVoterId(req);
		const created = await prisma.vote.create({
			data: { pollId, optionId, voterId },
		});
		return NextResponse.json({ id: created.id }, { status: 201 });
	} catch {
		return NextResponse.json({ error: "Cannot vote (maybe already voted)" }, { status: 400 });
	}
}