# Asset Shop — Project Plan

---

## ✅ Already Delivered

- Express REST API with TypeScript
- React frontend with TypeScript + Vite
- Swagger documentation
- ESLint
- Vitest integration tests with 95% coverage thresholdS
- GitHub Actions CI/CD pipeline (lint + test + coverage)
- Codecov integration

---

## Phase 1 — MVP (Core Foundation)

### Backend

- PostgreSQL setup + connection
- Docker + docker-compose for local setup ✅
- User Service — registration, login, JWT auth
- Role-based access control (admin, customer)
- Product Service — CRUD (name, description, price, category, tags, images)
- Order Service — place, view, cancel orders
- Payment gateway — mock implementation

### Frontend

- State management setup (Zustand)
- Home page — featured products and categories
- Product Catalog page — list products
- Product Details page — single product view
- Cart and Checkout page
- User Dashboard — customer (order history, tracking)
- User Dashboard — admin (manage products, process orders)
- Responsive UI
- Lazy loading + code splitting

---

## Phase 2 — Real-Time & Performance

### Backend

- Redis caching for frequently accessed endpoints
- WebSockets or SSE for real-time order status updates
- Notification Service — email notifications (order confirmation)
- Push notifications for real-time updates
- Rate limiting (express-rate-limit or Redis)

### Frontend

- Real-time order status updates in UI

---

## Phase 3 — Search & Event-Driven

### Backend

- Elasticsearch integration — full-text search and filtering for products
- Message queue (RabbitMQ, Kafka, or Redis Streams) for inter-service communication
- Analytics — total revenue, most purchased products, orders per user

### Frontend

- Search and filter on Product Catalog page
- Analytics dashboard in admin view

---

## Phase 4 — Advanced & Observability

### Backend

- Distributed tracing (Jaeger or OpenTelemetry)
- MongoDB for products or analytics (if needed)
- Recommendation system ("Users also bought")
- Webhook system for external notifications

### DevOps

- Kubernetes setup (optional)
- Cloud deployment (AWS, GCP, or Azure)
- Prometheus + Grafana monitoring

### Frontend

- Progressive Web App (PWA) for offline access

---

## Deliverables Checklist

- README per service explaining how to run locally
- Swagger/Postman API documentation ✅ (Swagger done)
- DB structure file
- Live demo link (optional)
- CI/CD pipeline ✅ (done)

---

## Business Rules

- This is an e-commerce platform — we do not restrict or check if a user has already purchased an item. Users can buy the same asset multiple times. Each purchase generates a new download link.

---

## Notes

- Start with monorepo structure, extract to true microservices as services grow
- Use PostgreSQL as primary DB for Phase 1, evaluate MongoDB need in Phase 3
- Payment gateway: Stripe (test mode — free, no real charges, swap test keys for live keys in production)
  - Use Stripe test card `4242 4242 4242 4242` for demos
  - Stripe Elements on frontend for secure card collection
  - `payments.provider` = `'stripe'`

---

## Ideas & Future Decisions

### Order Lifecycle & Statuses

Digital asset orders follow this lifecycle:

```
pending → paid → fulfilled → refunded
```


| Status      | Meaning                                                         |
| ----------- | --------------------------------------------------------------- |
| `pending`   | Order created, payment not yet received, download link not sent |
| `paid`      | Payment captured, triggers email delivery job                   |
| `fulfilled` | Download link emailed to customer, `fulfilled_at` timestamp set |
| `refunded`  | Customer refunded, asset access revoked                         |


**Refund policy:** Refunds are only allowed within 30 days of `fulfilled_at`. Enforced in API business logic, not in the DB.

**Delivery is asynchronous:** payment capture and email sending are separate steps, which is why `paid` and `fulfilled` are distinct statuses.

---

### Asset Preview Strategy

Digital assets need a public preview (watermarked) and a private full-resolution file.

**Proposed approach:**

- **S3** — stores the original full-res asset (private, never publicly accessible)
- **Cloudinary** — hosts the watermarked preview (public, used for storefront display)
- **DB** stores two URLs per asset: `file_url` (S3) and `preview_url` (Cloudinary)

**On purchase:** API generates a temporary signed S3 URL and emails it to the customer. URL expires after a set period (e.g. 24 hours).

**Automation option (Phase 2+):**

- S3 upload triggers a Lambda function via `s3:ObjectCreated` event
- Lambda calls Cloudinary API to generate the watermarked preview
- Cloudinary pulls directly from S3 (no double upload)
- Lambda saves both URLs to the DB
- Main API never touches image processing — just reads URLs from DB

**For Phase 1 (MVP):** API handles Cloudinary upload directly on asset creation. Lambda automation can be added later.