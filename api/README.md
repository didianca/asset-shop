# Asset Shop — API

REST API built with **Node.js**, **Express**, and **TypeScript**.

## Local Development

### Prerequisites
- Node.js 20+

### Setup

Each service has its own environment file. Copy the template for each service and fill in your values:
```bash
cp src/services/auth/.env.example src/services/auth/.env
```

Then start the dev server:
```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

> To run the full stack including PostgreSQL, use `docker-compose up --build` from the repo root. See the [root README](../README.md).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the dev server on port 3000, watches for file changes and restarts automatically |
| `npm run build` | Compiles TypeScript from `src/` to JavaScript in `dist/` |
| `npm start` | Runs the compiled production build from `dist/index.js` |
| `npm test` | Runs all tests once |
| `npm run test:watch` | Runs tests and re-runs on file changes |
| `npm run test:coverage` | Runs tests with coverage report (enforces 95% threshold) |
| `npm run test:ui` | Opens the Vitest visual dashboard in the browser |
| `npm run lint` | Runs ESLint across all source files |
| `npm run lint:fix` | Runs ESLint and auto-fixes issues where possible |
| `npx prisma migrate dev --name <name>` | Creates and applies a new migration locally |
| `npx prisma migrate deploy` | Applies pending migrations (used in Docker/CI) |
| `npx prisma generate` | Regenerates the Prisma client after schema changes |
| `npx prisma studio` | Opens a visual DB browser at `http://localhost:5555` |

## Swagger

API documentation is auto-generated from `@openapi` JSDoc comments and hosted at `$API_URL/api-docs`.

Always update JSDoc comments on new or modified routes before committing.

## CI/CD

A GitHub Actions pipeline (`.github/workflows/ci.yml` at the repo root) runs on every PR targeting `main`. The pipeline blocks merging if:
- Any lint errors are found
- Test coverage drops below 95%

Coverage reports are uploaded to `https://codecov.io/gh/didianca/asset-shop`.

To view the HTML coverage report locally after running `npm run test:coverage`:

```bash
start coverage/index.html
```

## Design Decisions

These are intentional deviations from standard e-commerce patterns, made to fit the nature of a **digital art asset platform**.

### No Order Cancellation
Standard e-commerce supports cancelling orders between placement and fulfillment. For digital assets, payment capture and delivery happen near-instantaneously — there is no window in which a cancellation is meaningful. Instead, customers can request a **refund within 30 days** of fulfillment if they have a valid reason (e.g. broken or misrepresented asset).

### Bundles and Tags Instead of Categories
Standard e-commerce uses hierarchical product categories. For a digital art platform where all products are images, categories add no value. Instead:
- **Tags** — handle discovery and filtering (e.g. `dark`, `minimalist`, `4K`, `portrait`)
- **Bundles** — group related assets together with an optional discount, replacing the concept of a product collection

### No Stock Quantity
Physical products have inventory. Digital assets do not — selling the same file to 1000 customers costs nothing extra and depletes nothing. The `stock_quantity` field is omitted entirely.

### No Shipping Addresses
Digital assets are delivered via email (signed S3 download link). No physical address is needed at any point in the order flow.

## File Structure

```
api/
├── prisma/
│   ├── schema.prisma           # Database schema — source of truth for all models
│   └── migrations/             # Auto-generated SQL migration files (committed to git)
├── src/
│   ├── generated/
│   │   └── prisma/             # Auto-generated Prisma client (gitignored — run prisma generate)
│   ├── lib/
│   │   └── email.ts            # AWS SES client — sends transactional emails
│   ├── middleware/
│   │   └── auth.ts             # JWT authentication + requireAdmin middleware
│   ├── services/
│   │   └── auth/
│   │       ├── .env            # Auth service env vars (gitignored)
│   │       ├── .env.example    # Auth service env template (committed)
│   │       ├── tests/
│   │       │   ├── setup.ts        # Loads auth/.env before tests run
│   │       │   ├── email.test.ts
│   │       │   ├── login.test.ts
│   │       │   ├── middleware.test.ts
│   │       │   ├── register.test.ts
│   │       │   └── verify.test.ts
│   │       ├── routes/
│   │       │   ├── index.ts        # Auth router
│   │       │   ├── login.ts        # POST /auth/login
│   │       │   ├── register.ts     # POST /auth/register
│   │       │   └── verify.ts       # GET /auth/verify
│   │       └── auth.types.ts       # RegisterBody, LoginBody, JwtPayload
│   ├── app.ts                  # Express app setup — middleware and routes
│   ├── db.ts                   # Prisma client singleton
│   ├── swagger.ts              # Swagger/OpenAPI spec configuration
│   └── index.ts                # Entry point — loads service envs, starts server
├── tests/
│   └── app.test.ts             # API-level integration tests (health check)
├── dist/                       # Compiled JavaScript output (generated by npm run build)
├── Dockerfile                  # Production Docker image
├── eslint.config.js            # ESLint configuration
├── vitest.config.ts            # Vitest and coverage configuration
├── package.json
└── tsconfig.json
```
