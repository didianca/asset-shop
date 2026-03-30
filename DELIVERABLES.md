# Asset Shop — Deliverables Report

This document is a comprehensive handoff for the Asset Shop project. It maps every requirement from the original instructions to what was delivered, explains design decisions and trade-offs made along the way, and outlines what comes next.

---

## Development Approach — Phases

Rather than attempting all requirements at once, development was organized into four incremental phases. Each phase builds on the one before it and adds a distinct capability layer:

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | Core platform — services, CRUD, payments, frontend, deployment | **Delivered** |
| **Phase 2** | Real-time updates, caching, notification worker | Planned |
| **Phase 3** | Elasticsearch, event-driven messaging, analytics | Planned |
| **Phase 4** | Observability, recommendations, microservice extraction | Planned |

**Phase 1 is fully delivered.** It covers the entire product lifecycle end-to-end: a user can register, browse products, add items to a cart, pay with Stripe, receive an email with download links, and request a refund. An admin can manage products, process orders, and upload assets. The platform is deployed to AWS and backed by a CI/CD pipeline enforcing 95% test coverage.

Phases 2 through 4 are scoped, documented, and architecturally accounted for — the codebase is structured so that each phase can be added without rewriting what already exists. Details for each planned phase are in the [Next Steps](#next-steps) section at the end of this document.

---

## Instructions — Status & Commentary

Below is every requirement from the original instructions. Each item includes a **Status** label and a **Comment** explaining what was built, what was changed from the original spec, and why.

### Objective

> Build a Scalable E-commerce Platform with the following features:

**1. Architecture to handle product management, order processing, and user management.**

- **Status:** Delivered
- **Comment:** The API is built with Express + TypeScript and organized into six self-contained services (auth, product, cart, order, payment, upload), each with its own routes, types, config, and tests. This mirrors microservice boundaries inside a monorepo — the services are independently testable and can be extracted into separate deployables in Phase 4 without rewriting application logic. PostgreSQL (via Prisma ORM) backs all structured data across 11 tables with full migration history.

**2. Real-time notifications for order updates.**

- **Status:** Planned (Phase 2)
- **Comment:** The order status lifecycle is fully implemented (pending, paid, fulfilled, refund_pending, refunded) with an immutable audit trail (`order_status_history` table). What is not yet wired is the WebSocket/SSE push to the client. The data model supports it — Phase 2 adds the transport layer. Email notifications for order events (fulfillment, refund) are delivered today via direct SES calls; the planned SQS + Lambda worker (Phase 2) will decouple this into an async pipeline.

**3. Search and filter functionality using an external search engine.**

- **Status:** Partially delivered — tag-based filtering is live; Elasticsearch is planned for Phase 3
- **Comment:** Products can be filtered by multiple tags in the catalog UI. Tags are created on-the-fly during product creation and reused by slug, giving admins a flexible taxonomy without upfront category management. Full-text search by name and price-range filtering via Elasticsearch is scoped for Phase 3. The current tag filter covers the most common browsing pattern for a digital asset store and was prioritized over Elasticsearch because it delivers immediate value with no additional infrastructure.

**4. Optimized performance with caching and asynchronous processing.**

- **Status:** Planned (Phase 2)
- **Comment:** Redis caching for high-read endpoints (product listings, tags) and an SQS-backed async email pipeline are scoped for Phase 2. The current architecture already separates concerns cleanly — adding a cache layer in front of product queries and moving email sends behind a queue are additive changes, not rewrites.

---

### Core Functionalities

**1. User Management Service — registration, authentication (JWT or OAuth2), role-based access control**

- **Status:** Delivered
- **Comment:** The auth service implements JWT-based authentication with 12-hour token expiry. Users register with email and password (bcrypt-hashed), then verify their email via a link sent through AWS SES. Role-based access control distinguishes two roles: `admin` and `customer`. Every route except registration and login is protected by auth middleware that verifies the JWT and checks that the user's status is `active` — pending and soft-deleted users are rejected. Admin-only routes (product management, order status updates) use an additional `requireAdmin` middleware. Rate limiting is applied to auth endpoints: 20 requests/hour for registration, 10 requests/15 minutes for login and email verification.

**2. Product Service — CRUD, categories/tags/images, search and filter**

- **Status:** Delivered (CRUD, tags, images); Elasticsearch search planned (Phase 3)
- **Comment:** Full CRUD is implemented for products — create, read (list + detail), and update. There is no hard delete; products are deactivated via update (setting `active: false`), which preserves referential integrity with existing orders. Categories were replaced with a **tag system** — this was a deliberate design decision. Tags are more flexible for a digital asset store where a single asset can belong to multiple discovery paths (e.g., "watercolor", "landscape", "premium"). Tags are created on-the-fly during product create/update and reused by slug, so admins don't need a separate category management step. A `GET /products/tags` endpoint returns all available tags for the catalog filter UI. Product images are stored in S3: the original file is private, and a watermarked preview is generated at upload time using Sharp. The upload endpoint validates files using magic-byte detection (not just file extensions) to prevent malicious uploads.

**3. Order Service — place, view, cancel orders; real-time status; payment integration**

- **Status:** Delivered (place, view, refund, payment); real-time planned (Phase 2)
- **Comment:** Orders are created from the user's cart and tracked through a status lifecycle: `pending` → `paid` → `fulfilled` → `refunded`. **Cancel was replaced with refund** — this was a deliberate decision for a digital asset platform. Because payment capture and asset delivery are near-instantaneous for digital goods, there is no meaningful window to cancel. Instead, customers can request a refund within 30 days of fulfillment, which is enforced programmatically using the `order_status_history` table. An additional `refund_pending` status was added so admins can review refund requests before processing them. Payment is integrated with **Stripe in test mode** — not a mock. The API creates real PaymentIntents, handles Stripe webhooks for payment confirmation and failure, and the frontend uses Stripe's PaymentElement for PCI-compliant checkout. On successful payment, the webhook handler automatically marks the order as paid and clears the cart. Real-time status updates via WebSocket/SSE are scoped for Phase 2.

**4. Notification Service — email notifications, push notifications**

- **Status:** Partially delivered (email via SES); async worker and push notifications planned (Phase 2)
- **Comment:** Email notifications are sent via AWS SES for verification emails and order events. The current implementation calls SES directly from the application code. Phase 2 replaces this with an SQS + Lambda architecture: services publish to a queue, and a dedicated Lambda function handles all SES sending with automatic retries and a dead-letter queue. Push notifications (in-app via WebSocket or browser push) are also scoped for Phase 2. The database already includes a `notifications` table with typed notification records (order_fulfilled, payment_failed, refund_requested, order_refunded) to support this.

**5. Analytics — total revenue, most purchased products, orders per user**

- **Status:** Planned (Phase 3)
- **Comment:** The data model supports all required analytics — orders, order items, and payments are fully tracked with timestamps, amounts, and user associations. Building the aggregation queries and an admin analytics dashboard is scoped for Phase 3. PostgreSQL with its built-in aggregation functions is sufficient for Phase 1-3 volumes; a document store (MongoDB) would only be evaluated if analytics data outgrows relational queries at scale.

---

### Frontend Requirements

**Pages**

| Page | Status | Comment |
|------|--------|---------|
| **Home** | Delivered | Hero section, featured products, on-sale items, latest additions. Products are grouped dynamically — no hardcoded content. |
| **Product Catalog** | Delivered | Responsive product grid with multi-select tag filtering. Elasticsearch-backed search bar is planned for Phase 3. |
| **Product Details** | Delivered | Pricing with discount display, add-to-cart action, tag badges. |
| **Cart and Checkout** | Delivered | Full cart management (add, remove, clear) with discount-aware pricing. Two-step checkout: review order, then pay via Stripe PaymentElement. Post-payment status page confirms the order. |
| **User Dashboard (Customer)** | Delivered | Paginated order history, order detail with status timeline, refund request within 30-day window. |
| **User Dashboard (Admin)** | Delivered | Product management (create, edit, deactivate), order management with status transitions (mark paid, fulfilled, process refund). Analytics view is planned for Phase 3. |

**Features**

| Feature | Status | Comment |
|---------|--------|---------|
| Responsive UI | Delivered | Tailwind CSS with mobile-first design, breakpoint-based grids. |
| State management | Delivered | Zustand stores for auth, cart, products, and UI state. Zustand was chosen over Redux for its minimal boilerplate and hook-first API, which suits this project's scale. |
| TypeScript | Delivered | Full TypeScript across both API and client. Zod schemas on the backend generate inferred types; the frontend has its own typed API layer. |
| Lazy loading and code splitting | Delivered | All 14 pages are loaded via `React.lazy` + `Suspense`, producing separate chunks per route. |

---

### Backend Requirements

**Architecture — service-based structure**

- **Status:** Delivered
- **Comment:** The API follows a **monorepo-first, microservices-eventual** pattern. All six services (auth, product, cart, order, payment, upload) live under `api/src/services/<name>/` with their own routes, types, config, and test directories. Each service is fully self-contained — it owns its environment variables, validation schemas, and integration tests. This mirrors microservice boundaries so that in Phase 4, each folder becomes its own deployable with its own Dockerfile and CI workflow, without rewriting any business logic. A shared middleware layer (`auth`, `validate`) and database client (`prisma`) are the only cross-cutting concerns.

**Data Persistence — relational database (PostgreSQL); document store (MongoDB) if needed**

- **Status:** Delivered (PostgreSQL); MongoDB deferred
- **Comment:** PostgreSQL is the sole database, accessed via Prisma ORM. The schema includes 11 tables with full migration history, UUIDs for all primary keys, soft deletes for users, and an immutable order status audit trail. MongoDB was evaluated and deferred — PostgreSQL's JSONB column type is sufficient for any semi-structured data needs through Phase 3. If analytics data at Phase 3 scale proves to outgrow relational aggregation, MongoDB would be introduced then.

**Event-Driven Communication — message queues (RabbitMQ, Kafka, Redis Streams)**

- **Status:** Planned (Phase 2-3)
- **Comment:** Inter-service communication currently happens through direct function calls within the monorepo, which is appropriate for Phase 1 where all services run in the same process. Phase 2 introduces SQS as the first message queue (for the email notification worker). Phase 3 expands to a broader event-driven architecture for analytics event capture and cross-service messaging.

**Real-Time Functionality — WebSockets or SSE**

- **Status:** Planned (Phase 2)
- **Comment:** The order status lifecycle and history table are already in place. Phase 2 adds WebSocket or SSE connections so that the customer dashboard reflects status changes in real time without polling.

**Caching — Redis**

- **Status:** Planned (Phase 2)
- **Comment:** Product listings and tag data are the primary cache candidates. Phase 2 adds Redis as a cache layer in front of these high-read endpoints.

**Search — Elasticsearch**

- **Status:** Planned (Phase 3)
- **Comment:** Tag-based filtering is live today. Phase 3 integrates Elasticsearch for full-text search by product name, tag, and price range with relevance scoring.

---

### Advanced Features

**1. Distributed Tracing (Jaeger / OpenTelemetry)**

- **Status:** Planned (Phase 4)
- **Comment:** Becomes valuable after microservice extraction, when requests span multiple processes. Not needed while services share a single process in Phase 1.

**2. Rate Limiting**

- **Status:** Delivered
- **Comment:** Implemented using `express-rate-limit` on all auth endpoints — registration (20/hour), login (10/15 min), and email verification (10/15 min). These are the highest-risk endpoints for abuse. Rate limiting on other endpoints (e.g., Redis-backed global rate limiting) is scoped for Phase 2.

**3. Security — RBAC, HTTPS, password encryption**

- **Status:** Delivered
- **Comment:** Multiple layers of security are in place:
  - **RBAC:** JWT middleware on every protected route; `requireAdmin` guard on admin-only operations.
  - **Password hashing:** All passwords hashed with bcrypt before storage.
  - **Security headers:** Helmet middleware applies HSTS, X-Frame-Options, Content-Security-Policy, and other headers.
  - **CORS:** Configured to accept requests only from the allowed frontend origin.
  - **File upload validation:** Magic-byte detection via `file-type` library (not just extension checks) prevents malicious file uploads.
  - **Stripe webhook verification:** Signature validation on all incoming Stripe webhooks prevents spoofed payment events.
  - **Input validation:** Zod schemas validate every request body before it reaches a handler.
  - HTTPS is handled at the infrastructure level (ACM certificate + ALB termination in the CDK stack).

**4. Scalability — Docker, Kubernetes**

- **Status:** Delivered (Docker + Docker Compose); Kubernetes planned (Phase 4)
- **Comment:** All services are Dockerized with a multi-stage `Dockerfile` (development and production targets). `docker-compose.yml` orchestrates the full local stack: PostgreSQL, migration runner, API, and client. Kubernetes orchestration is scoped for Phase 4 alongside microservice extraction.

---

### Bonus Features

**1. Progressive Web App (PWA)**

- **Status:** Planned (Phase 4)

**2. DevOps — CI/CD, cloud deployment, monitoring**

| Item | Status | Comment |
|------|--------|---------|
| CI/CD pipeline | Delivered | GitHub Actions runs on every PR to `main`: ESLint, TypeScript build, Vitest with 95% coverage threshold, Codecov reporting. |
| Cloud deployment | Delivered | AWS CDK provisions the full stack: ECS Fargate (compute), RDS PostgreSQL (database), ECR (container registry), Route 53 + ACM (DNS + TLS), Application Load Balancer. Single `npm run deploy` command from repo root. |
| Monitoring (Prometheus + Grafana) | Planned (Phase 4) | Becomes more valuable after microservice extraction when there are multiple processes to observe. |

**3. Backend bonuses — recommendation system, webhook system**

- **Status:** Planned (Phase 4)
- **Comment:** The order and order item data needed for "Users also bought" recommendations is already captured. Implementation is straightforward once analytics queries are in place (Phase 3).

**4. Testing**

- **Status:** Delivered
- **Comment:** The test suite uses **Vitest + Supertest** for integration tests against a real PostgreSQL test database (`asset_shop_test`). No Prisma mocks — every test hits the actual database, which catches issues that mocked tests would miss (migration problems, constraint violations, query bugs). CI enforces a **95% coverage threshold** — builds fail if coverage drops below this. Test files mirror the source structure under each service's `tests/` directory. Each test file uses a factory function pattern to avoid repeating full object literals (e.g., `makeProduct`, `makeOrder` helpers with spread overrides).

---

### Deliverables Checklist

| Deliverable | Status | Location                                                                                                                                                              |
|-------------|--------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| README explaining how to run locally | Delivered | `README.md` (root), `api/README.md`, `client/README.md`                                                                                                               |
| API documentation (Swagger) | Delivered | Available at `/api-docs` when the server is running; JSDoc `@openapi` annotations on all route handlers                                                               |
| DB structure file | Delivered | `api/prisma/schema.prisma` (source of truth) + `api/prisma/migrations/` (full migration history)                                                                      |
| GitHub repository | Delivered | Monorepo with npm workspaces, branching strategy with PRs to `main`                                                                                                   |
| CI/CD pipeline | Delivered | `.github/workflows/ci.yml` — lint, build, test, coverage on every PR                                                                                                  |
| Cloud deployment | Delivered | `infra/` — AWS CDK stack (ECS Fargate + RDS + ECR + Route 53 + ACM)                                                                                                   |
| Live demo link | Delivered | https://asset-shop.com/  - SES currently works only with "cleared" email accounts. Anyone trying to "poke around" needs to be added to the allowlist in SES directly. |

---

### Evaluation Criteria

**1. System Design — adherence to microservices principles; asynchronous and event-driven communication**

- **Comment:** The codebase adheres to microservices principles at the code level: each service is self-contained with its own routes, types, configuration, and tests. Services do not reach into each other's internals. The monorepo is a deployment convenience, not an architectural coupling — Phase 4 extracts each service into its own deployable without changing business logic. Event-driven communication (message queues) is scoped for Phase 2-3. In Phase 1, direct function calls within a single process are the pragmatic choice; adding a message broker before there are multiple processes to communicate between would be premature complexity.

**2. Code Quality — clean, modular, testable code; effective use of TypeScript**

- **Comment:** TypeScript is used end-to-end across API and client. On the backend, Zod schemas serve as the single source of truth for request validation — types are inferred from schemas, so validation and typing never drift apart. Environment variables are centralized in per-service config modules using `env-var` with lazy getters, which means the app fails fast on startup if any required variable is missing. ESLint enforces code style. The test suite runs against a real database with 95% coverage enforcement. On the frontend, Zustand stores are typed, API functions return typed responses, and components use TypeScript props throughout.

**3. Performance — efficient database queries and caching; scalability and fault tolerance**

- **Comment:** Database queries use Prisma's query builder with selective field inclusion and indexed lookups (indexes on userId, status, createdAt, and slug fields). Product listings support pagination. The schema uses UUIDs (not auto-increment) for horizontal scaling readiness. Caching (Redis) is the primary Phase 2 addition. The Docker + ECS Fargate deployment supports horizontal scaling by increasing the desired task count. RDS in a private subnet with security group rules provides fault isolation.

---

## Delivered — Full Feature Inventory

### Backend Services

| Service | Endpoints | Key Capabilities |
|---------|-----------|-----------------|
| **Auth** | `POST /register`, `POST /login`, `GET /verify` | JWT tokens (12h), bcrypt passwords, SES email verification, rate limiting |
| **Product** | `POST /products`, `GET /products`, `GET /products/:id`, `PUT /products/:id`, `GET /products/tags` | Full CRUD, tag system (create-on-the-fly, reuse by slug), active/inactive toggling |
| **Upload** | `POST /upload` | S3 storage, Sharp watermark generation, Multer multipart handling, magic-byte validation, 10MB limit |
| **Cart** | `GET /cart`, `POST /cart/items`, `DELETE /cart/items/:productId`, `DELETE /cart` | One cart per user, discount-aware pricing, auto-clear on checkout |
| **Order** | `POST /orders`, `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`, `POST /orders/:id/refund` | Create from cart, paginated listing (role-scoped), admin status transitions, 30-day refund window, immutable status history |
| **Payment** | `POST /payments`, `GET /payments/:orderId`, `POST /payments/webhook` | Stripe PaymentIntents, webhook signature verification, automatic order status update on payment success/failure |

### Database Schema (11 tables)

`users` -- `products` -- `tags` -- `product_tags` -- `bundles` -- `carts` -- `cart_items` -- `orders` -- `order_items` -- `order_status_history` -- `payments` -- `notifications`

Key design decisions:
- **UUIDs** for all primary keys (horizontal scaling readiness)
- **Soft deletes** for users (preserves order history integrity)
- **Immutable audit trail** via `order_status_history` (every status change is a timestamped record)
- **`refund_pending` status** added to the order lifecycle so admins can review before processing
- **No quantity on cart items** — digital assets are not stock-limited
- **`unit_price` captured on order items** — preserves the price at purchase time even if the product price changes later

### Frontend (14 pages)

- **Public:** Home, Product Catalog, Product Details, Login, Register, Email Verification, 404
- **Authenticated:** Cart, Checkout, Checkout Status
- **Admin:** Dashboard, Product Management (create/edit/deactivate), Order Management (status transitions)
- **Customer:** Dashboard (order history, order detail with status timeline, refund requests)

Reusable component library: Button, Input, Card, Badge, Modal, Toast, Pagination, Spinner, ErrorBoundary.

### Infrastructure & DevOps

- **Docker Compose** — full local stack (PostgreSQL, migration runner, API, client) with hot reload
- **GitHub Actions** — PR-gated CI: ESLint, TypeScript build, integration tests, 95% coverage threshold, Codecov
- **AWS CDK** — single stack provisioning: VPC (2 AZs), ECS Fargate, RDS PostgreSQL (private subnet), ECR, Route 53, ACM certificate, Application Load Balancer
- **Prisma migrations** run automatically at container startup (both local Docker and production ECS)

### Security

- Helmet security headers (HSTS, CSP, X-Frame-Options)
- CORS restricted to allowed origins
- Rate limiting on auth endpoints (express-rate-limit)
- JWT auth middleware on all protected routes
- Admin role guard on management endpoints
- bcrypt password hashing
- Stripe webhook signature verification
- Magic-byte file validation on uploads
- Zod request body validation on all endpoints
- HTTPS via ACM + ALB TLS termination

---

## Next Steps

### Phase 2 — Real-Time & Performance

**Goal:** Add the transport and caching layers that make the platform feel live and responsive.

| Item | Description | Why it matters |
|------|-------------|----------------|
| **Redis caching** | Cache product listings and tag data with TTL-based invalidation | Product pages are the highest-traffic endpoints; caching eliminates redundant database queries |
| **WebSocket/SSE order updates** | Push order status changes to connected clients in real time | Customers currently need to refresh to see status changes; real-time updates complete the order tracking experience |
| **SQS + Lambda email worker** | Decouple email sending into an async pipeline with retries and DLQ | Direct SES calls in the request path add latency and have no retry mechanism; a queue-based worker is more resilient |
| **Push notifications** | In-app notifications via WebSocket or browser push API | Enables proactive communication (e.g., "Your order has been fulfilled") without relying solely on email |
| **Expanded rate limiting** | Redis-backed global rate limiting across all endpoints | Auth-only rate limiting covers the highest-risk surface; global limiting protects against broader abuse |

### Phase 3 — Search & Event-Driven Architecture

**Goal:** Add the search engine, analytics, and messaging backbone.

| Item | Description | Why it matters |
|------|-------------|----------------|
| **Elasticsearch** | Full-text search by product name, tag, and price range with relevance scoring | Tag filtering covers browsing; search covers intent-driven discovery ("I want a watercolor landscape") |
| **Message queue** | RabbitMQ or Redis Streams for inter-service event publishing | Prepares the architecture for microservice extraction; services communicate via events rather than direct calls |
| **Analytics dashboard** | Total revenue, most purchased products, orders per user | All data is already captured; this phase builds the aggregation queries and admin UI |
| **Advanced catalog filtering** | Price range sliders, sort by newest/price/popularity | Extends the catalog UI to support the richer query capabilities Elasticsearch enables |

### Phase 4 — Observability & Extraction

**Goal:** Production-grade observability and true microservice deployment.

| Item | Description | Why it matters |
|------|-------------|----------------|
| **Microservice extraction** | Each `api/src/services/<name>/` becomes its own deployable with its own Dockerfile and CI workflow | Independent deployment, scaling, and failure isolation per service |
| **Distributed tracing** | Jaeger or OpenTelemetry across service boundaries | Essential for debugging cross-service request flows after extraction |
| **Prometheus + Grafana** | Metrics collection and dashboarding | Visibility into latency, error rates, and resource usage across services |
| **Recommendation engine** | "Users also bought" suggestions on product pages | Order item data is already captured; collaborative filtering can be built on top |
| **Webhook system** | Notify external systems on significant events (order placed, refund processed) | Enables third-party integrations without polling |
| **PWA** | Service worker for offline catalog browsing and push notifications | Improves mobile experience and enables re-engagement via push |
| **Kubernetes** | Container orchestration for multi-service deployment | Replaces single-task ECS deployment with per-service scaling and health management |

### Bundle Support (ready for any phase)

The database schema already includes `bundles`, `bundle_id`, and `is_bundle` columns. The data model is in place; remaining work is:

1. Bundle CRUD API routes (admin-only)
2. Webhook fulfillment logic — resolve bundle members and generate per-asset download URLs
3. Admin UI for bundle management
4. Catalog UI — bundle badges and filtering
5. Integration tests

This can be picked up in any future phase as a standalone feature track.
