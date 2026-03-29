import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "gor-test-";
const ADMIN_EMAIL = "admin@getorder.test";
const CUSTOMER_EMAIL = "customer@getorder.test";
const CUSTOMER2_EMAIL = "customer2@getorder.test";
const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

let adminId: string;
let customerId: string;
let customer2Id: string;
let adminToken: string;
let customerToken: string;
let customer2Token: string;

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/gor-preview.jpg",
  assetKey: "assets/gor-asset.zip",
  createdBy: adminId,
  ...overrides,
});

async function createOrderForUser(token: string, productId: string): Promise<string> {
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
  await prisma.orderStatusHistory.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.order.deleteMany({ where: { userId: { in: [customerId, customer2Id, adminId] } } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [customerId, customer2Id] } } } });
  await prisma.cart.deleteMany({ where: { userId: { in: [customerId, customer2Id] } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.orderStatusHistory.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.order.deleteMany({ where: { userId: { in: [customerId, customer2Id, adminId] } } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [customerId, customer2Id] } } } });
  await prisma.cart.deleteMany({ where: { userId: { in: [customerId, customer2Id] } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL, CUSTOMER2_EMAIL] } } });
  await prisma.$disconnect();
});

describe("GET /orders/:id", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get(`/api/orders/${NONEXISTENT_ID}`);
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid UUID", async () => {
    const res = await request(app)
      .get("/api/orders/not-a-uuid")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent order", async () => {
    const res = await request(app)
      .get(`/api/orders/${NONEXISTENT_ID}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Order not found");
  });

  it("customer can see their own order", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GOR Own", slug: `${SLUG_PREFIX}own` }),
    });
    const orderId = await createOrderForUser(customerToken, product.id);

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderId);
    expect(res.body.userId).toBe(customerId);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].name).toBe("GOR Own");
    expect(res.body.statusHistory).toHaveLength(1);
    expect(res.body.payment).toBeNull();
  });

  it("customer gets 404 for another user's order", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GOR Other", slug: `${SLUG_PREFIX}other` }),
    });
    const orderId = await createOrderForUser(customer2Token, product.id);

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Order not found");
  });

  it("admin can see any order", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GOR Admin", slug: `${SLUG_PREFIX}admin` }),
    });
    const orderId = await createOrderForUser(customerToken, product.id);

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(orderId);
    expect(res.body.userId).toBe(customerId);
  });

  it("includes status history sorted by createdAt asc", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GOR History", slug: `${SLUG_PREFIX}history` }),
    });
    const orderId = await createOrderForUser(customerToken, product.id);

    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "paid", changedBy: adminId, note: "Payment captured" },
    });

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.statusHistory).toHaveLength(2);
    expect(res.body.statusHistory[0].status).toBe("pending");
    expect(res.body.statusHistory[1].status).toBe("paid");
    const t0 = new Date(res.body.statusHistory[0].createdAt).getTime();
    const t1 = new Date(res.body.statusHistory[1].createdAt).getTime();
    expect(t0).toBeLessThanOrEqual(t1);
  });

  it("includes payment info when present", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GOR Payment", slug: `${SLUG_PREFIX}payment` }),
    });
    const orderId = await createOrderForUser(customerToken, product.id);

    await prisma.payment.create({
      data: { orderId, amount: 10, status: "captured", provider: "stripe", providerReference: "pi_test_123" },
    });

    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.payment).not.toBeNull();
    expect(res.body.payment.amount).toBe(10);
    expect(res.body.payment.status).toBe("captured");
    expect(res.body.payment.provider).toBe("stripe");
  });
});
