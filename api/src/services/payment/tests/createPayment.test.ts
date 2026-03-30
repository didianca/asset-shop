import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "cpay-test-";
const ADMIN_EMAIL = "admin@createpayment.test";
const CUSTOMER_EMAIL = "customer@createpayment.test";
const CUSTOMER2_EMAIL = "customer2@createpayment.test";
const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

let adminId: string;
let customerId: string;
let customer2Id: string;
let customerToken: string;
let customer2Token: string;

const mockPaymentIntentCreate = vi.fn();

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: { create: mockPaymentIntentCreate },
    })),
  };
});

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/cpay-preview.jpg",
  assetKey: "assets/cpay-asset.zip",
  createdBy: adminId,
  ...overrides,
});

async function createOrder(token: string, productId: string): Promise<string> {
  await request(app)
    .post("/api/cart/items")
    .set("Authorization", `Bearer ${token}`)
    .send({ productIds: [productId] });
  const res = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`);
  return res.body.id as string;
}

beforeAll(async () => {
  const admin = await prisma.user.create({
    data: { email: ADMIN_EMAIL, passwordHash: "x", firstName: "Admin", lastName: "Test", role: "admin", status: "active" },
  });
  adminId = admin.id;

  const customer = await prisma.user.create({
    data: { email: CUSTOMER_EMAIL, passwordHash: "x", firstName: "Customer", lastName: "Test", role: "customer", status: "active" },
  });
  customerId = customer.id;
  customerToken = jwt.sign({ id: customer.id, role: "customer", status: "active" }, authConfig.jwtSecret, { expiresIn: "1h" });

  const customer2 = await prisma.user.create({
    data: { email: CUSTOMER2_EMAIL, passwordHash: "x", firstName: "Customer2", lastName: "Test", role: "customer", status: "active" },
  });
  customer2Id = customer2.id;
  customer2Token = jwt.sign({ id: customer2.id, role: "customer", status: "active" }, authConfig.jwtSecret, { expiresIn: "1h" });
});

beforeEach(async () => {
  mockPaymentIntentCreate.mockReset();
  mockPaymentIntentCreate.mockResolvedValue({
    id: "pi_test_123",
    client_secret: "pi_test_123_secret_abc",
  });

  await prisma.payment.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.orderStatusHistory.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.order.deleteMany({ where: { userId: { in: [customerId, customer2Id, adminId] } } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [customerId, customer2Id] } } } });
  await prisma.cart.deleteMany({ where: { userId: { in: [customerId, customer2Id] } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.orderStatusHistory.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.order.deleteMany({ where: { userId: { in: [customerId, customer2Id, adminId] } } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [customerId, customer2Id] } } } });
  await prisma.cart.deleteMany({ where: { userId: { in: [customerId, customer2Id] } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL, CUSTOMER2_EMAIL] } } });
  await prisma.$disconnect();
});

describe("POST /payments", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post("/api/payments")
      .send({ orderId: NONEXISTENT_ID });
    expect(res.status).toBe(401);
  });

  it("returns 400 for missing orderId", async () => {
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid orderId", async () => {
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId: "not-a-uuid" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent order", async () => {
    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId: NONEXISTENT_ID });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Order not found");
  });

  it("returns 404 when customer tries to pay another user's order", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "CP Other", slug: `${SLUG_PREFIX}other` }),
    });
    const orderId = await createOrder(customer2Token, product.id);

    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId });
    expect(res.status).toBe(404);
  });

  it("returns 400 when order is not in pending status", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "CP NotPending", slug: `${SLUG_PREFIX}not-pending` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });

    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Order is not in pending status");
  });

  it("returns 409 when payment already exists", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "CP Duplicate", slug: `${SLUG_PREFIX}duplicate` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.payment.create({
      data: { orderId, amount: 10, status: "pending", provider: "stripe", providerReference: "pi_existing" },
    });

    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Payment already exists for this order");
  });

  it("creates payment and returns clientSecret", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "CP Success", slug: `${SLUG_PREFIX}success` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    const res = await request(app)
      .post("/api/payments")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ orderId });

    expect(res.status).toBe(201);
    expect(res.body.clientSecret).toBe("pi_test_123_secret_abc");
    expect(res.body.paymentId).toBeDefined();

    expect(mockPaymentIntentCreate).toHaveBeenCalledWith({
      amount: 1000,
      currency: "usd",
      metadata: { orderId, userId: customerId },
    });

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    expect(payment).not.toBeNull();
    expect(payment!.status).toBe("pending");
    expect(payment!.providerReference).toBe("pi_test_123");
  });

  it("returns 500 when Stripe API fails", async () => {
    mockPaymentIntentCreate.mockRejectedValueOnce(new Error("Stripe error"));

    const product = await prisma.product.create({
      data: makeProduct({ name: "CP Fail", slug: `${SLUG_PREFIX}fail` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    await expect(
      request(app)
        .post("/api/payments")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ orderId })
    ).resolves.toMatchObject({ status: 500 });
  });
});
