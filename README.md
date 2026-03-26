# Asset Shop

E-commerce platform built as a monorepo with microservices.

## Stack

| Technology | Purpose |
|---|---|
| Node.js + Express | Service runtimes |
| React + Vite | Frontend |
| TypeScript | Static typing across all packages |
| PostgreSQL | Relational database |
| Docker + Docker Compose | Containerization and local orchestration |
| Vitest + Supertest | Testing |
| ESLint | Linting |
| Swagger / OpenAPI | API documentation |
| GitHub Actions | CI/CD |

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

## CI/CD

GitHub Actions runs on every PR to `main`:
- Lint + test + coverage (95% threshold enforced)
- Coverage uploaded to [Codecov](https://codecov.io/gh/didianca/asset-shop)
