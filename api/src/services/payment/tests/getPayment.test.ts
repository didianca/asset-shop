import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "gpay-test-";
const ADMIN_EMAIL = "admin@getpayment.test";
const CUSTOMER_EMAIL = "customer@getpayment.test";
const CUSTOMER2_EMAIL = "customer2@getpayment.test";
const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

let adminId: string;
let customerId: string;
let customer2Id: string;
let adminToken: string;
let customerToken: string;
let customer2Token: string;

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: { create: vi.fn() },
      webhooks: { constructEvent: vi.fn() },
    })),
  };
});

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/gpay-preview.jpg",
  assetKey: "assets/gpay-asset.zip",
  createdBy: adminId,
  ...overrides,
});

async function createOrderWithPayment(token: string, productId: string): Promise<string> {
  await request(app)
    .post("/api/cart/items")
    .set("Authorization", `Bearer ${token}`)
    .send({ productIds: [productId] });
  const orderRes = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`);
  const orderId = orderRes.body.id as string;

  await prisma.payment.create({
    data: { orderId, amount: 10, status: "captured", provider: "stripe", providerReference: "pi_gp_test" },
  });

  return orderId;
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL, CUSTOMER2_EMAIL] } } });

  const admin = await prisma.user.create({
    data: { email: ADMIN_EMAIL, passwordHash: "x", firstName: "Admin", lastName: "Test", role: "admin", status: "active" },
  });
  adminId = admin.id;
  adminToken = jwt.sign({ id: admin.id, role: "admin", status: "active" }, authConfig.jwtSecret, { expiresIn: "1h" });

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

describe("GET /payments/:orderId", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get(`/api/payments/${NONEXISTENT_ID}`);
    expect(res.status).toBe(401);
  });

  it("returns 404 when no payment exists for order", async () => {
    const res = await request(app)
      .get(`/api/payments/${NONEXISTENT_ID}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Payment not found");
  });

  it("customer can see their own payment", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GP Own", slug: `${SLUG_PREFIX}own` }),
    });
    const orderId = await createOrderWithPayment(customerToken, product.id);

    const res = await request(app)
      .get(`/api/payments/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orderId).toBe(orderId);
    expect(res.body.amount).toBe(10);
    expect(res.body.status).toBe("captured");
    expect(res.body.provider).toBe("stripe");
  });

  it("customer gets 404 for another user's payment", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GP Other", slug: `${SLUG_PREFIX}other` }),
    });
    const orderId = await createOrderWithPayment(customer2Token, product.id);

    const res = await request(app)
      .get(`/api/payments/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(404);
  });

  it("admin can see any payment", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GP Admin", slug: `${SLUG_PREFIX}admin` }),
    });
    const orderId = await createOrderWithPayment(customerToken, product.id);

    const res = await request(app)
      .get(`/api/payments/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orderId).toBe(orderId);
  });
});
