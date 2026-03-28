# Asset Shop — API

REST API built with **Node.js**, **Express**, and **TypeScript**.

## Local Development

### Prerequisites
- Node.js 20+

### Setup

Each service has its own environment file. Copy the template and fill in your values — this only needs to be done once on first setup:
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

## Environment Variables & Config

Each service owns a `<service>.config.ts` file that centralises all environment variable access for that service using [`env-var`](https://www.npmjs.com/package/env-var). Shared utilities (e.g. `lib/email.ts`) have their own config file alongside them.

| File | Variables |
|---|---|
| `src/services/auth/auth.config.ts` | `JWT_SECRET` |
| `src/lib/email.config.ts` | `AWS_REGION`, `AWS_SES_ACCESS_KEY`, `AWS_SES_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL`, `API_URL` |

All variables are declared with `.required()` — the service will throw a clear error at startup if any are missing, rather than failing silently at runtime. Getters are used instead of top-level constants so that values are read lazily on each call, which keeps tests able to manipulate `process.env` without module resets.

When a new service is added, create a corresponding `<service>.config.ts` inside its folder and declare all its env vars there.

## File Structure

```
api/
├── prisma/                     # Schema and migrations
├── src/
│   ├── lib/                    # Shared utilities (email, etc.) — each with its own *.config.ts and tests/
│   ├── middleware/             # Express middleware (auth, validate, etc.) — each with its own tests/
│   ├── services/
│   │   └── <service>/
│   │       ├── .env                 # Service env vars (gitignored)
│   │       ├── .env.example         # Env template (committed)
│   │       ├── <service>.config.ts  # Centralised env var access for this service
│   │       ├── <service>.types.ts   # Zod schemas + inferred request/response types
│   │       ├── utils.ts             # Service-scoped utility functions (formatting, slug generation, etc.)
│   │       ├── routes/              # Route handlers — validation applied at router level via validate()
│   │       └── tests/               # Integration tests + setup.ts
│   ├── app.ts                  # Express app setup
│   ├── db.ts                   # Prisma client singleton
│   └── index.ts                # Entry point
└── tests/                      # API-level tests
```
