import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "hw-test-";
const ADMIN_EMAIL = "admin@handlewebhook.test";
const CUSTOMER_EMAIL = "customer@handlewebhook.test";

let adminId: string;
let customerId: string;
let customerToken: string;

const mockConstructEvent = vi.fn();

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: { create: vi.fn() },
      webhooks: { constructEvent: mockConstructEvent },
    })),
  };
});

const makeProduct = <T extends object>(overrides: T): { price: number; previewUrl: string; assetUrl: string; createdBy: string } & T => ({
  price: 10,
  previewUrl: "https://cdn.example.com/hw-preview.jpg",
  assetUrl: "https://s3.example.com/hw-asset.zip",
  createdBy: adminId,
  ...overrides,
});

async function createOrderWithPayment(token: string, productId: string): Promise<{ orderId: string; paymentId: string }> {
  await request(app)
    .post("/cart/items")
    .set("Authorization", `Bearer ${token}`)
    .send({ productIds: [productId] });
  const orderRes = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${token}`);
  const orderId = orderRes.body.id as string;

  const payment = await prisma.payment.create({
    data: { orderId, amount: 10, status: "pending", provider: "stripe", providerReference: "pi_webhook_test" },
  });

  return { orderId, paymentId: payment.id };
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });

  const admin = await prisma.user.create({
    data: { email: ADMIN_EMAIL, passwordHash: "x", firstName: "Admin", lastName: "Test", role: "admin", status: "active" },
  });
  adminId = admin.id;

  const customer = await prisma.user.create({
    data: { email: CUSTOMER_EMAIL, passwordHash: "x", firstName: "Customer", lastName: "Test", role: "customer", status: "active" },
  });
  customerId = customer.id;
  customerToken = jwt.sign({ id: customer.id, role: "customer", status: "active" }, authConfig.jwtSecret, { expiresIn: "1h" });
});

beforeEach(async () => {
  mockConstructEvent.mockReset();

  await prisma.payment.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.orderStatusHistory.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.order.deleteMany({ where: { userId: { in: [customerId, adminId] } } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
  await prisma.cart.deleteMany({ where: { userId: customerId } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.orderStatusHistory.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.order.deleteMany({ where: { userId: { in: [customerId, adminId] } } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
  await prisma.cart.deleteMany({ where: { userId: customerId } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });
  await prisma.$disconnect();
});

describe("POST /payments/webhook", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await request(app)
      .post("/payments/webhook")
      .send(JSON.stringify({ type: "test" }))
      .set("Content-Type", "application/json");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Missing stripe-signature header");
  });

  it("returns 400 for invalid signature", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    const res = await request(app)
      .post("/payments/webhook")
      .set("stripe-signature", "bad_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "test" }));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid signature");
  });

  it("captures payment and transitions order to paid on payment_intent.succeeded", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Success", slug: `${SLUG_PREFIX}success` }),
    });
    const { orderId } = await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test" } },
    });

    const res = await request(app)
      .post("/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Payment captured");

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    expect(payment!.status).toBe("captured");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order!.status).toBe("paid");

    const history = await prisma.orderStatusHistory.findMany({ where: { orderId }, orderBy: { createdAt: "desc" } });
    expect(history[0]!.status).toBe("paid");
    expect(history[0]!.note).toBe("Payment captured via Stripe");
  });

  it("records failure on payment_intent.payment_failed", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Failed", slug: `${SLUG_PREFIX}failed` }),
    });
    const { orderId } = await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_webhook_test" } },
    });

    const res = await request(app)
      .post("/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.payment_failed" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Payment failure recorded");

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    expect(payment!.status).toBe("failed");
  });

  it("returns 200 for unhandled event types", async () => {
    mockConstructEvent.mockReturnValue({
      type: "charge.refunded",
      data: { object: {} },
    });

    const res = await request(app)
      .post("/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "charge.refunded" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Event type not handled");
  });

  it("returns 200 and skips when payment not found", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_nonexistent" } },
    });

    const res = await request(app)
      .post("/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Payment not found, skipping");
  });

  it("is idempotent — already captured payment stays captured", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Idempotent", slug: `${SLUG_PREFIX}idempotent` }),
    });
    const { orderId } = await createOrderWithPayment(customerToken, product.id);

    await prisma.payment.update({ where: { orderId }, data: { status: "captured" } });

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test" } },
    });

    const res = await request(app)
      .post("/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Already processed");
  });
});
