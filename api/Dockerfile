FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/

RUN npm ci

COPY api/tsconfig.json ./api/
COPY api/src ./api/src

WORKDIR /app/api
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY package.json package-lock.json ./
COPY api/package.json ./api/

RUN npm ci --omit=dev

COPY --from=builder /app/api/dist ./api/dist

EXPOSE 3000

CMD ["node", "api/dist/index.js"]
