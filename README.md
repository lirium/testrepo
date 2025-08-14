# Spreadsheet-like App (Server + Client)

## Docker quickstart

1. Prepare environment (server JWT secret):

```bash
cp server/.env server/.env.example 2>/dev/null || true
# Or create server/.env with at least:
# JWT_SECRET=your-strong-secret
```

2. Build and run:

```bash
docker compose build
docker compose up -d
```

- Backend: http://localhost:4000 (health: /health)
- Frontend: http://localhost:5173

3. Stop:

```bash
docker compose down
```

## Notes
- SQLite DB stored in named volume `server_data` under `/app/data` in the container.
- Change `PUBLIC_URL`/`VITE_API_URL` in `docker-compose.yml` if hosting differently.
- To run DB migrations manually: `docker compose exec server npx prisma migrate deploy`.