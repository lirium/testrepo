"use client";
import { useState } from "react";

type Option = { id: string; text: string; votes: number };

export default function VoteClient({ pollId, options: initial }: { pollId: string; options: Option[] }) {
	const [options, setOptions] = useState<Option[]>(initial);
	const [voted, setVoted] = useState(false);
	const [loading, setLoading] = useState<string | null>(null);

	async function refresh() {
		const res = await fetch(`/api/polls/${pollId}`, { cache: "no-store" });
		if (res.ok) {
			const data = await res.json();
			setOptions(data.options as Option[]);
		}
	}

	async function vote(optionId: string) {
		try {
			setLoading(optionId);
			const res = await fetch(`/api/polls/${pollId}/vote`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ optionId }),
			});
			if (!res.ok) throw new Error("fail");
			setVoted(true);
			await refresh();
		} catch {
			alert("Не удалось проголосовать. Возможно, вы уже голосовали.");
		} finally {
			setLoading(null);
		}
	}

	const total = options.reduce((s, o) => s + o.votes, 0) || 1;

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				{options.map((o) => {
					const pct = Math.round((o.votes / total) * 100);
					return (
						<button
							key={o.id}
							onClick={() => vote(o.id)}
							disabled={!!loading || voted}
							className="w-full text-left border rounded p-3 disabled:opacity-50"
						>
							<div className="flex items-center justify-between">
								<span>{o.text}</span>
								<span className="text-sm text-gray-500">{pct}%</span>
							</div>
							<div className="mt-2 h-2 bg-gray-200 rounded">
								<div className="h-2 bg-black rounded" style={{ width: `${pct}%` }} />
							</div>
						</button>
					);
				})}
			</div>

			<div className="flex gap-2">
				<button onClick={refresh} className="px-3 py-2 border rounded">Обновить</button>
				<button
					onClick={async () => { await navigator.clipboard.writeText(window.location.href); }}
					className="px-3 py-2 border rounded"
				>
					Поделиться ссылкой
				</button>
			</div>
		</div>
	);
}