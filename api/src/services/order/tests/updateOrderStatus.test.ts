import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "uos-test-";
const ADMIN_EMAIL = "admin@updateorderstatus.test";
const CUSTOMER_EMAIL = "customer@updateorderstatus.test";
const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

let adminId: string;
let customerId: string;
let adminToken: string;
let customerToken: string;

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/uos-preview.jpg",
  assetKey: "assets/uos-asset.zip",
  createdBy: adminId,
  ...overrides,
});

async function createOrder(token: string, productId: string): Promise<string> {
  await request(app)
    .post("/cart/items")
    .set("Authorization", `Bearer ${token}`)
    .send({ productIds: [productId] });
  const res = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${token}`);
  return res.body.id as string;
}

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });

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
});

beforeEach(async () => {
  await prisma.orderStatusHistory.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.order.deleteMany({ where: { userId: { in: [customerId, adminId] } } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
  await prisma.cart.deleteMany({ where: { userId: customerId } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.orderStatusHistory.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.order.deleteMany({ where: { userId: { in: [customerId, adminId] } } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
  await prisma.cart.deleteMany({ where: { userId: customerId } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });
  await prisma.$disconnect();
});

describe("PATCH /orders/:id/status", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app)
      .patch(`/orders/${NONEXISTENT_ID}/status`)
      .send({ status: "paid" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    const res = await request(app)
      .patch(`/orders/${NONEXISTENT_ID}/status`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ status: "paid" });
    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent order", async () => {
    const res = await request(app)
      .patch(`/orders/${NONEXISTENT_ID}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid" });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Order not found");
  });

  it("returns 400 for missing status in body", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Missing", slug: `${SLUG_PREFIX}missing` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid status value", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Invalid", slug: `${SLUG_PREFIX}invalid` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "pending" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for extra fields in body", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Extra", slug: `${SLUG_PREFIX}extra` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid", extra: true });
    expect(res.status).toBe(400);
  });

  it("transitions pending -> paid", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Paid", slug: `${SLUG_PREFIX}paid` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("paid");
    expect(res.body.statusHistory).toHaveLength(2);
    expect(res.body.statusHistory[1].status).toBe("paid");
  });

  it("transitions paid -> fulfilled", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Fulfilled", slug: `${SLUG_PREFIX}fulfilled` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid" });

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "fulfilled" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("fulfilled");
    expect(res.body.statusHistory).toHaveLength(3);
  });

  it("transitions fulfilled -> refunded within 30 days", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Refund", slug: `${SLUG_PREFIX}refund` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid" });

    await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "fulfilled" });

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "refunded" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("refunded");
    expect(res.body.statusHistory).toHaveLength(4);
  });

  it("rejects refund when 30-day window has expired", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Expired", slug: `${SLUG_PREFIX}expired` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    await prisma.order.update({ where: { id: orderId }, data: { status: "fulfilled" } });

    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "fulfilled", changedBy: adminId, createdAt: thirtyOneDaysAgo },
    });

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "refunded" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Refund window has expired (30 days from fulfillment)");
  });

  it("rejects invalid transition pending -> fulfilled", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Skip", slug: `${SLUG_PREFIX}skip` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "fulfilled" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid transition from 'pending' to 'fulfilled'");
  });

  it("rejects backward transition paid -> pending", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Backward", slug: `${SLUG_PREFIX}backward` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });

    // "pending" is not a valid target status (rejected by Zod schema)
    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "pending" });

    expect(res.status).toBe(400);
  });

  it("rejects transition from terminal state refunded", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Terminal", slug: `${SLUG_PREFIX}terminal` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    await prisma.order.update({ where: { id: orderId }, data: { status: "refunded" } });

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid transition from 'refunded' to 'paid'");
  });

  it("creates history entry with note and changedBy", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Note", slug: `${SLUG_PREFIX}note` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    const res = await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid", note: "Payment confirmed via Stripe" });

    expect(res.status).toBe(200);
    const lastEntry = res.body.statusHistory[res.body.statusHistory.length - 1];
    expect(lastEntry.status).toBe("paid");
    expect(lastEntry.note).toBe("Payment confirmed via Stripe");
    expect(lastEntry.changedBy).toBe(adminId);
  });
});
