FROM node:20-alpine AS builder

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

FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/

RUN npm ci --omit=dev

# Copy compiled app
COPY --from=builder /app/api/dist ./api/dist

# Copy prisma folder so migrate deploy knows which migrations to apply
COPY --from=builder /app/api/prisma ./api/prisma

# Copy prisma CLI binary from builder so we can run migrate deploy at startup
COPY --from=builder /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder /app/api/node_modules/prisma ./api/node_modules/prisma

EXPOSE 3000

# Run migrations on every startup, then start the server.
# prisma migrate deploy is idempotent — skips already-applied migrations.
CMD ["sh", "-c", "npx prisma migrate deploy --schema=api/prisma/schema.prisma && node api/dist/index.js"]
