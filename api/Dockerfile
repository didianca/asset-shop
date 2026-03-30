FROM node:20-slim AS builder

RUN apt-get update -y && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/
COPY client/package.json ./client/

RUN npm ci

# --- Build API ---
COPY api/tsconfig.json ./api/
COPY api/prisma ./api/prisma
COPY api/src ./api/src

WORKDIR /app/api

# Generate the Prisma client from schema.prisma before compiling TypeScript.
# The generated client lives in src/generated/prisma (gitignored) so it must
# be regenerated on every build.
RUN npx prisma generate

RUN npm run build

# --- Build Client ---
WORKDIR /app
COPY client/ ./client/

ARG VITE_STRIPE_PK
ENV VITE_STRIPE_PK=$VITE_STRIPE_PK

RUN npm run build -w client

# ---------------------------------------------------------------------------
# Dev stage — runs tsx with Node inspector for WebStorm / Docker debugging
# Usage: set `target: dev` in docker-compose and mount api/src as a volume
# ---------------------------------------------------------------------------
FROM builder AS dev

WORKDIR /app/api

EXPOSE 3000 9229

CMD ["sh", "-c", "npx prisma generate && node --enable-source-maps --inspect=0.0.0.0:9229 --import tsx --watch src/index.ts"]

# ---------------------------------------------------------------------------
# Production stage
# ---------------------------------------------------------------------------
FROM node:20-slim AS production

RUN apt-get update -y && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/

RUN npm ci --omit=dev

# Copy compiled API
COPY --from=builder /app/api/dist ./api/dist

# Copy generated Prisma client (gitignored, must be carried over from builder)
COPY --from=builder /app/api/src/generated ./api/dist/generated

# Copy prisma folder so migrate deploy knows which migrations to apply
COPY --from=builder /app/api/prisma ./api/prisma

# Copy built client — served by Express static middleware
COPY --from=builder /app/client/dist ./api/client

EXPOSE 3000

CMD ["sh", "-c", "cd api && npx prisma migrate deploy && cd /app && node api/dist/index.js"]
