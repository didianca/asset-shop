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
| Zod | Request body validation — schemas defined in `*.types.ts`, applied via `validate` middleware |
| env-var | Environment variable validation — centralised in per-service `*.config.ts` files |
| Stripe | Payment processing (PaymentIntents, webhooks) |
| AWS SES | Transactional email (verification emails) |
| AWS S3 | Asset file storage (original + watermarked previews) |
| Sharp | Image processing — watermark generation at upload time |
| Multer | Multipart file upload handling |
| Vitest + Supertest | Testing |
| Swagger / OpenAPI | API documentation |
| tsx | Dev server with hot reload |

**Client (`client/`)**

| Technology | Purpose |
|---|---|
| React 18 | UI component library |
| Vite | Dev server, bundler, and build tool |

**Infrastructure (`infra/`)**

| Technology | Purpose |
|---|---|
| AWS CDK | Infrastructure as code — provisions all AWS resources |
| AWS ECS Fargate | Compute — runs the API + client in a single container |
| AWS RDS PostgreSQL | Managed relational database (private isolated subnet) |
| AWS ECR | Container registry — CDK pushes the Docker image here |
| AWS Secrets Manager | RDS credentials auto-generated and stored at deploy time |

## Structure

```
asset-shop/
├── api/            # REST API service
├── client/         # React frontend
├── infra/          # AWS CDK stack
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

Copy the Docker Compose environment template and fill in your values:
```bash
cp .env.example .env
```

Each service also has its own environment file. Copy and fill in the templates:
```bash
cp api/.env.example api/.env                                              # DATABASE_URL
cp api/src/services/auth/.env.example api/src/services/auth/.env         # Auth service vars
cp api/src/services/cart/.env.example api/src/services/cart/.env         # Cart service vars
cp api/src/services/order/.env.example api/src/services/order/.env       # Order service vars
cp api/src/services/payment/.env.example api/src/services/payment/.env   # Stripe keys
cp api/src/services/upload/.env.example api/src/services/upload/.env     # S3 keys
```

### Start all services

```bash
docker-compose up --build
```

This starts Postgres, runs any pending database migrations, then starts the API and client. The `migrate` service runs once and exits — this is intentional.

### Database migrations

Migrations run automatically via the `migrate` service every time you do `docker-compose up`. You do not need to run them manually in Docker.

For local development outside Docker, run migrations manually after creating or pulling a new migration:

```bash
npx prisma migrate dev --name <name> -w api   # create + apply a new migration
npx prisma migrate deploy -w api              # apply pending migrations only
```

When adding a new migration, always commit the generated files in `api/prisma/migrations/` — they are the source of truth for the database schema.

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| API Docs (Swagger) | http://localhost:3000/api-docs |
| Frontend | http://localhost:5173 |
| PostgreSQL | localhost:5432 |

## Deployment

Infrastructure is provisioned with AWS CDK. All CDK code lives in `infra/`. Environment variables are loaded from `infra/.env` (see `infra/.env.example`).

### Architecture

```
Internet → ECS Fargate (public subnet, port 3000) → RDS PostgreSQL (private isolated)
                                                   → S3 (existing)
                                                   → SES (existing)
```

The API and compiled client are packaged into a single Docker image. On every deploy CDK:
1. Builds the Docker image locally — installs deps, runs `prisma generate`, compiles API TypeScript, runs Vite to bundle the client
2. Pushes the image to ECR
3. Updates the ECS task definition and forces a new service deployment
4. Runs `prisma migrate deploy` at container startup before the server starts

### Prerequisites
- Docker running locally (CDK builds the image on your machine during deploy)
- AWS credentials configured (`aws sts get-caller-identity` to verify)
- `infra/.env` populated:
  ```bash
  cp infra/.env.example infra/.env
  # fill in values
  ```

### Commands

```bash
npm run deploy                  # from repo root — builds and deploys everything
cd infra && npm run synth       # dry run — generate CloudFormation template only
cd infra && npm run destroy     # tear down all AWS resources
```

First-time setup only:
```bash
cd infra && npm install                          # install CDK deps
cd infra && npm run synth -- --bootstrap         # bootstrap CDK (one-time per account/region)
```

> Bootstrap can also be run as: `cd infra && dotenv -e .env -- npx cdk bootstrap`

### First deploy

`DATABASE_URL` isn't known until after the first deploy (RDS endpoint is created by CDK). After the first deploy completes:

1. Retrieve the generated RDS password from the stack output `RdsSecretArn`:
   ```bash
   aws secretsmanager get-secret-value --secret-id <RdsSecretArn>
   ```
2. Construct `DATABASE_URL`:
   ```
   postgresql://postgres:<password>@<RdsEndpoint>:5432/assetshop
   ```
3. Set it in `infra/.env` and redeploy so migrations run.

### Gotchas
- **Ephemeral IP** — Fargate public IP changes on task restart. Update the Stripe webhook URL after each deploy.
- **No ALB** — traffic goes directly to the Fargate task's public IP.

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

