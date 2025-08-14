# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy sources
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma client and build TS
RUN npx prisma generate
RUN npm run build

# Runtime image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install production deps only
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy prisma schema and built dist
COPY prisma ./prisma
COPY --from=builder /app/dist ./dist

# Directory to hold SQLite DB (override via DATABASE_URL=file:./data/dev.db)
RUN mkdir -p /app/data

ENV PORT=4000
EXPOSE 4000

# Apply migrations (SQLite) then start server
CMD ["sh","-c","npx prisma migrate deploy && node dist/index.js"]