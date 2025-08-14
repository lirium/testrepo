import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useParams } from 'react-router-dom'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function AuthGate({ children }: { children: ReactNode }) {
	const token = localStorage.getItem('token')
	if (!token) return <Navigate to="/login" replace />
	return <>{children}</>
}

function Login() {
	const nav = useNavigate()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	async function submit(e: React.FormEvent) {
		e.preventDefault()
		setError('')
		const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
		const data = await res.json()
		if (!res.ok) { setError(data.error ? 'Ошибка входа' : 'Ошибка'); return }
		localStorage.setItem('token', data.token)
		nav('/documents')
	}
	return (
		<div className="container">
			<h2>Вход</h2>
			<form onSubmit={submit}>
				<input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
				<input placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} />
				<button type="submit">Войти</button>
				{error && <div className="error">{error}</div>}
			</form>
			<p>Нет аккаунта? <Link to="/register">Регистрация</Link></p>
		</div>
	)
}

function Register() {
	const nav = useNavigate()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [fullName, setFullName] = useState('')
	const [error, setError] = useState('')
	async function submit(e: React.FormEvent) {
		e.preventDefault()
		setError('')
		const res = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, fullName }) })
		const data = await res.json()
		if (!res.ok) { setError(data.error ? 'Ошибка регистрации' : 'Ошибка'); return }
		localStorage.setItem('token', data.token)
		nav('/documents')
	}
	return (
		<div className="container">
			<h2>Регистрация</h2>
			<form onSubmit={submit}>
				<input placeholder="Имя" value={fullName} onChange={e => setFullName(e.target.value)} />
				<input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
				<input placeholder="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} />
				<button type="submit">Создать</button>
				{error && <div className="error">{error}</div>}
			</form>
			<p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
		</div>
	)
}

function Documents() {
	const [owned, setOwned] = useState<any[]>([])
	const [shared, setShared] = useState<any[]>([])
	const [title, setTitle] = useState('')
	async function load() {
		const res = await fetch(`${API_URL}/documents`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
		const data = await res.json(); if (res.ok) { setOwned(data.owned); setShared(data.shared) }
	}
	useEffect(() => { load() }, [])
	async function createDoc() {
		if (!title) return
		const res = await fetch(`${API_URL}/documents`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ title }) })
		if (res.ok) { setTitle(''); await load() }
	}
	return (
		<div className="container">
			<h2>Мои документы</h2>
			<div className="row">
				<input placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} />
				<button onClick={createDoc}>Создать</button>
			</div>
			<h3>Владение</h3>
			<ul>
				{owned.map(d => <li key={d.id}><Link to={`/editor/${d.id}`}>{d.title}</Link></li>)}
			</ul>
			<h3>Доступные</h3>
			<ul>
				{shared.map(d => <li key={d.id}><Link to={`/editor/${d.id}`}>{d.title}</Link></li>)}
			</ul>
		</div>
	)
}

function SimpleGrid({ rows, onRowsChange }: { rows: any[]; onRowsChange: (next: any[]) => void }) {
	const cols = ['id', 'A', 'B']
	function updateCell(rowIndex: number, key: string, value: string) {
		const next = rows.map((r, i) => i === rowIndex ? { ...r, [key]: value } : r)
		onRowsChange(next)
	}
	return (
		<table>
			<thead>
				<tr>{cols.map(c => <th key={c}>{c}</th>)}</tr>
			</thead>
			<tbody>
				{rows.map((r, i) => (
					<tr key={r.id ?? i}>
						{cols.map(c => (
							<td key={c}>
								{c === 'id' ? (r[c] ?? i) : (
									<input value={r[c] ?? ''} onChange={e => updateCell(i, c, e.target.value)} />
								)}
							</td>
						))}
					</tr>
				))}
			</tbody>
		</table>
	)
}

function EditorInner({ id }: { id: string }) {
	const [doc, setDoc] = useState<any | null>(null)
	const [perm, setPerm] = useState<{ isOwner: boolean; canView: boolean; canEdit: boolean; canPrint: boolean; canCopy: boolean } | null>(null)
	const [rows, setRows] = useState<any[]>([{ id: 0, A: '', B: '' }])
	const wsRef = useRef<WebSocket | null>(null)
	const pendingRef = useRef<any | null>(null)

	useEffect(() => {
		(async () => {
			const res = await fetch(`${API_URL}/documents/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
			const data = await res.json()
			if (res.ok) {
				setDoc(data.document)
				setPerm(data.permissions)
				const content = JSON.parse(data.document.content || '{}')
				if (content.rows) setRows(content.rows)
			}
		})()
	}, [id])

	useEffect(() => {
		if (!doc) return
		const wsUrl = `${API_URL.replace('http', 'ws')}/ws?token=${encodeURIComponent(localStorage.getItem('token')||'')}&documentId=${id}`
		const ws = new WebSocket(wsUrl)
		wsRef.current = ws
		ws.onmessage = (ev) => {
			const msg = JSON.parse(ev.data)
			if (msg.type === 'init' || msg.type === 'remote_update') {
				setRows(msg.content.rows || rows)
			}
		}
		ws.onopen = () => {
			if (pendingRef.current) {
				ws.send(JSON.stringify({ type: 'update', content: pendingRef.current }))
				pendingRef.current = null
			}
		}
		return () => { wsRef.current = null; ws.close() }
	}, [doc, id])

	async function persist(content: any) {
		await fetch(`${API_URL}/documents/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ content }) })
	}

	function onRowsChange(nextRows: any[]) {
		setRows(nextRows)
		const content = { rows: nextRows }
		persist(content)
		const ws = wsRef.current
		if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'update', content }))
		else pendingRef.current = content
	}

	async function doExport() {
		const res = await fetch(`${API_URL}/documents/${id}/export`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
		if (!res.ok) return
		const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const a = document.createElement('a'); a.href = url; a.download = `${doc?.title||'document'}.json`; a.click(); URL.revokeObjectURL(url)
	}

	function doPrint() {
		const token = localStorage.getItem('token')||''
		window.open(`${API_URL}/documents/${id}/print?token=${encodeURIComponent(token)}`, '_blank')
	}

	return (
		<div className="container">
			<h2>{doc?.title}</h2>
			<SimpleGrid rows={rows} onRowsChange={onRowsChange} />
			<div className="row">
				<Link to={`/history/${id}`}>История</Link>
				<Link to={`/share/${id}`}>Поделиться</Link>
				<button onClick={doExport} disabled={!perm?.canCopy}>Экспорт</button>
				<button onClick={doPrint} disabled={!perm?.canPrint}>Печать</button>
			</div>
		</div>
	)
}

function EditorPage() { const { id } = useParams(); return <EditorInner id={id as string} /> }

function ShareInner({ id }: { id: string }) {
	const [permissions, setPermissions] = useState({ canView: true, canEdit: false, canPrint: false, canCopy: false })
	const [userId, setUserId] = useState('')
	const [inviteUrl, setInviteUrl] = useState('')
	const [users, setUsers] = useState<any[]>([])
	const [q, setQ] = useState('')
	async function grant() {
		await fetch(`${API_URL}/documents/${id}/permissions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ userId, ...permissions }) })
	}
	async function createLink() {
		const res = await fetch(`${API_URL}/documents/${id}/invite-links`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify(permissions) })
		const data = await res.json(); if (res.ok) setInviteUrl(data.url)
	}
	async function search() {
		const res = await fetch(`${API_URL}/users?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
		const data = await res.json(); if (res.ok) setUsers(data.users)
	}
	return (
		<div className="container">
			<h2>Доступ</h2>
			<div className="row">
				<input placeholder="Поиск пользователей" value={q} onChange={e=>setQ(e.target.value)} />
				<button onClick={search}>Найти</button>
			</div>
			<ul>
				{users.map(u => (
					<li key={u.id}>
						{u.fullName} ({u.email})
						<button onClick={()=>setUserId(u.id)}>Выбрать</button>
					</li>
				))}
			</ul>
			<div className="row">
				<input placeholder="User ID" value={userId} onChange={e => setUserId(e.target.value)} />
				<button onClick={grant}>Выдать права</button>
			</div>
			<div className="row">
				<label><input type="checkbox" checked={permissions.canView} onChange={e => setPermissions(p=>({...p, canView: e.target.checked}))}/>Просмотр</label>
				<label><input type="checkbox" checked={permissions.canEdit} onChange={e => setPermissions(p=>({...p, canEdit: e.target.checked}))}/>Редактирование</label>
				<label><input type="checkbox" checked={permissions.canPrint} onChange={e => setPermissions(p=>({...p, canPrint: e.target.checked}))}/>Печать</label>
				<label><input type="checkbox" checked={permissions.canCopy} onChange={e => setPermissions(p=>({...p, canCopy: e.target.checked}))}/>Копирование</label>
				<button onClick={createLink}>Создать ссылку</button>
			</div>
			{inviteUrl && <div>Ссылка: <a href={inviteUrl} target="_blank">{inviteUrl}</a></div>}
		</div>
	)
}

function SharePage() { const { id } = useParams(); return <ShareInner id={id as string} /> }

function InviteConsumeInner({ token }: { token: string }) {
	const nav = useNavigate()
	const [result, setResult] = useState('')
	useEffect(() => {
		(async () => {
			const res = await fetch(`${API_URL}/invites/consume`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }, body: JSON.stringify({ token }) })
			if (res.ok) { setResult('Права выданы'); nav('/documents') } else { setResult('Ссылка недействительна') }
		})()
	}, [token])
	return <div className="container"><h2>{result || 'Обрабатываем...'}</h2></div>
}

function InvitePage() { const { token } = useParams(); return <InviteConsumeInner token={token as string} /> }

function HistoryInner({ id }: { id: string }) {
	const [history, setHistory] = useState<any[]>([])
	async function load() {
		const res = await fetch(`${API_URL}/documents/${id}/history`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
		const data = await res.json(); if (res.ok) setHistory(data.history)
	}
	useEffect(() => { load() }, [id])
	async function revert(changeId: string) {
		const res = await fetch(`${API_URL}/documents/${id}/revert/${changeId}`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
		if (res.ok) await load()
	}
	return (
		<div className="container">
			<h2>История изменений</h2>
			<ul>
				{history.map(ch => (
					<li key={ch.id}>
						<div>{new Date(ch.createdAt).toLocaleString()} — {ch.changeType}</div>
						<pre>{ch.diff}</pre>
						<button onClick={() => revert(ch.id)}>Откатить</button>
					</li>
				))}
			</ul>
		</div>
	)
}

function HistoryPage() { const { id } = useParams(); return <HistoryInner id={id as string} /> }

export default function App() {
	return (
		<BrowserRouter>
			<nav className="nav">
				<Link to="/documents">Документы</Link>
				<Link to="/login" onClick={() => { localStorage.removeItem('token') }}>Выйти</Link>
			</nav>
			<Routes>
				<Route path="/" element={<Navigate to="/documents" replace />} />
				<Route path="/login" element={<Login />} />
				<Route path="/register" element={<Register />} />
				<Route path="/invite/:token" element={<AuthGate><InvitePage /></AuthGate>} />
				<Route path="/documents" element={<AuthGate><Documents /></AuthGate>} />
				<Route path="/editor/:id" element={<AuthGate><EditorPage /></AuthGate>} />
				<Route path="/share/:id" element={<AuthGate><SharePage /></AuthGate>} />
				<Route path="/history/:id" element={<AuthGate><HistoryPage /></AuthGate>} />
			</Routes>
		</BrowserRouter>
	)
}
