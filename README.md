# Asset Shop

E-commerce platform built as a monorepo with microservices.

## Stack

**Shared**

| Technology | Purpose |
|---|---|
| TypeScript | Static typing across all packages |
| Docker + Docker Compose | Containerization and local orchestration |
| ESLint | Linting |
| GitHub Actions | CI/CD |

**API (`api/`)**

| Technology | Purpose |
|---|---|
| Node.js + Express | HTTP server and routing |
| PostgreSQL | Relational database |
| Prisma | ORM — schema management, migrations, type-safe query client |
| Vitest + Supertest | Testing |
| Swagger / OpenAPI | API documentation |
| tsx | Dev server with hot reload |

**Client (`client/`)**

| Technology | Purpose |
|---|---|
| React 18 | UI component library |
| Vite | Dev server, bundler, and build tool |

## Structure

```
asset-shop/
├── api/            # REST API service
├── client/         # React frontend
├── docker-compose.yml
└── package.json    # npm workspaces root
```

## Services

Each service manages its own environment variables, scripts, and dependencies. See the individual READMEs for setup and usage details:

- [`api/`](./api/README.md) — REST API
- [`client/`](./client/README.md) — React frontend

## Local Development

### Prerequisites
- Node.js 20+
- Docker and Docker Compose

### Setup

Copy the environment template and fill in your values:
```bash
cp .env.example .env
```

### Start all services

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:3000/api-docs |
| Frontend | http://localhost:5173 |
| PostgreSQL | localhost:5432 |

## Adding Dependencies

Always install from the **repo root** using the `-w` flag. This keeps the root `package-lock.json` as the single source of truth and avoids generating per-service lockfiles.

```bash
# Add a dependency to a specific service
npm install <package> -w api
npm install <package> -w client

# Add a dev dependency
npm install -D <package> -w api
```

> Never run `npm install` from inside a service directory — it will generate a local `package-lock.json` which should not exist in this monorepo.

