FROM node:20-slim AS builder

RUN apt-get update -y && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/

RUN npm ci

COPY api/tsconfig.json ./api/
COPY api/prisma ./api/prisma
COPY api/src ./api/src

WORKDIR /app/api

# Generate the Prisma client from schema.prisma before compiling TypeScript.
# The generated client lives in src/generated/prisma (gitignored) so it must
# be regenerated on every build.
RUN npx prisma generate

RUN npm run build

FROM node:20-slim AS production

RUN apt-get update -y && apt-get install -y openssl --no-install-recommends && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/

RUN npm ci --omit=dev

# Copy compiled app
COPY --from=builder /app/api/dist ./api/dist

# Copy generated Prisma client (gitignored, must be carried over from builder)
COPY --from=builder /app/api/src/generated ./api/dist/generated

# Copy prisma folder so migrate deploy knows which migrations to apply
COPY --from=builder /app/api/prisma ./api/prisma

EXPOSE 3000

CMD ["node", "api/dist/index.js"]
