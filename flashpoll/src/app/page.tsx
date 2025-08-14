"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function Home() {
	const [question, setQuestion] = useState("");
	const [options, setOptions] = useState<string[]>(["Да", "Нет"]);
	const [loading, setLoading] = useState(false);
	const [polls, setPolls] = useState<{ id: string; question: string }[]>([]);

	useEffect(() => {
		fetch("/api/polls")
			.then((r) => r.json())
			.then((d) => setPolls(d.polls ?? []))
			.catch(() => {});
	}, []);

	function setOptionValue(index: number, value: string) {
		setOptions((prev) => prev.map((v, i) => (i === index ? value : v)));
	}

	function addOption() {
		setOptions((prev) => (prev.length < 6 ? [...prev, ""] : prev));
	}
	function removeOption(i: number) {
		setOptions((prev) => prev.filter((_, idx) => idx !== i));
	}

	async function createPoll() {
		setLoading(true);
		try {
			const res = await fetch("/api/polls", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ question, options: options.filter(Boolean) }),
			});
			if (!res.ok) throw new Error("fail");
			const data = await res.json();
			window.location.href = `/poll/${data.id}`;
		} catch {
			alert("Не удалось создать опрос");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="max-w-2xl mx-auto p-6 space-y-8">
			<div className="space-y-4">
				<h1 className="text-3xl font-bold">FlashPoll</h1>
				<p className="text-sm text-gray-500">Создай опрос за секунды. Поделись ссылкой. Голосуй без регистрации.</p>
				<input
					placeholder="Вопрос"
					value={question}
					onChange={(e) => setQuestion(e.target.value)}
					className="w-full border rounded px-3 py-2"
				/>
				<div className="space-y-2">
					{options.map((opt, i) => (
						<div key={i} className="flex gap-2">
							<input
								value={opt}
								onChange={(e) => setOptionValue(i, e.target.value)}
								placeholder={`Вариант ${i + 1}`}
								className="flex-1 border rounded px-3 py-2"
							/>
							<button className="text-red-500" onClick={() => removeOption(i)}>
								Удалить
							</button>
						</div>
					))}
					<div className="flex gap-2">
						<button onClick={addOption} className="px-3 py-2 border rounded">
							Добавить вариант
						</button>
						<button
							onClick={createPoll}
							disabled={loading || question.trim().length < 3 || options.filter(Boolean).length < 2}
							className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
						>
							Создать опрос
						</button>
					</div>
				</div>

			</div>

			<div>
				<h2 className="font-semibold mb-2">Недавние опросы</h2>
				<div className="space-y-2">
					{polls.map((p) => (
						<Link key={p.id} href={`/poll/${p.id}`} className="block border rounded px-3 py-2 hover:bg-gray-50">
							{p.question}
						</Link>
					))}
				</div>
			</div>
		</div>
	);
}
