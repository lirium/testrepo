import { prisma } from "@/lib/prisma";
import VoteClient from "./vote-client";

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const poll = await prisma.poll.findUnique({
		where: { id },
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

	if (!poll) return <div className="max-w-2xl mx-auto p-6">Опрос не найден</div>;

	const options = poll.options.map((o) => ({ id: o.id, text: o.text, votes: o._count.votes }));

	return (
		<div className="max-w-2xl mx-auto p-6 space-y-6">
			<h1 className="text-2xl font-bold">{poll.question}</h1>
			<VoteClient pollId={poll.id} options={options} />
		</div>
	);
}