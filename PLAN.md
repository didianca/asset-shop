# Asset Shop — Project Plan

---

## ✅ Already Delivered

- Express REST API with TypeScript
- React frontend with TypeScript + Vite
- Swagger documentation
- ESLint
- Vitest integration tests with 95% coverage threshold
- GitHub Actions CI/CD pipeline (lint + test + coverage)
- Codecov integration

---

## Phase 1 — MVP (Core Foundation)

### Backend

- PostgreSQL setup + connection
- Docker + docker-compose for local setup
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

## Notes

- Start with monorepo structure, extract to true microservices as services grow
- Use PostgreSQL as primary DB for Phase 1, evaluate MongoDB need in Phase 3
- Mock payment gateway is sufficient — no real Stripe/PayPal integration needed

