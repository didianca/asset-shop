import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const mockSendRefundConfirmationEmail = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/email.js", () => ({
  sendRefundConfirmationEmail: mockSendRefundConfirmationEmail,
}));

const SLUG_PREFIX = "rr-test-";
const ADMIN_EMAIL = "admin@requestrefund.test";
const CUSTOMER_EMAIL = "customer@requestrefund.test";
const CUSTOMER2_EMAIL = "customer2@requestrefund.test";
const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

let adminId: string;
let customerId: string;
let customer2Id: string;
let customerToken: string;
let customer2Token: string;

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/rr-preview.jpg",
  assetKey: "assets/rr-asset.zip",
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
  // Defensive cleanup — handles dirty DB from a previous interrupted run
  const stale = await prisma.user.findMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL, CUSTOMER2_EMAIL] } } });
  if (stale.length > 0) {
    const ids = stale.map((u) => u.id);
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.payment.deleteMany({ where: { order: { userId: { in: ids } } } });
    await prisma.orderStatusHistory.deleteMany({ where: { order: { userId: { in: ids } } } });
    await prisma.orderItem.deleteMany({ where: { order: { userId: { in: ids } } } });
    await prisma.order.deleteMany({ where: { userId: { in: ids } } });
    await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: ids } } } });
    await prisma.cart.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

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
  mockSendRefundConfirmationEmail.mockReset();
  mockSendRefundConfirmationEmail.mockResolvedValue(undefined);

  await prisma.notification.deleteMany({ where: { userId: { in: [customerId, customer2Id] } } });
  await prisma.payment.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.orderStatusHistory.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [customerId, customer2Id, adminId] } } } });
  await prisma.order.deleteMany({ where: { userId: { in: [customerId, customer2Id, adminId] } } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [customerId, customer2Id] } } } });
  await prisma.cart.deleteMany({ where: { userId: { in: [customerId, customer2Id] } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: { in: [customerId, customer2Id] } } });
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

describe("POST /orders/:id/refund", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post(`/api/orders/${NONEXISTENT_ID}/refund`)
      .send({ note: "I want a refund" });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUID", async () => {
    const res = await request(app)
      .post("/api/orders/not-a-uuid/refund")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "I want a refund" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing note", async () => {
    const res = await request(app)
      .post(`/api/orders/${NONEXISTENT_ID}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty note", async () => {
    const res = await request(app)
      .post(`/api/orders/${NONEXISTENT_ID}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent order", async () => {
    const res = await request(app)
      .post(`/api/orders/${NONEXISTENT_ID}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "I want a refund" });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Order not found");
  });

  it("returns 404 when customer tries to refund another user's order", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RR Other", slug: `${SLUG_PREFIX}other` }),
    });
    const orderId = await createOrder(customer2Token, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });

    const res = await request(app)
      .post(`/api/orders/${orderId}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "Not my order" });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Order not found");
  });

  it("returns 400 when order is in pending status", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RR Pending", slug: `${SLUG_PREFIX}pending` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    const res = await request(app)
      .post(`/api/orders/${orderId}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "Want refund" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cannot refund an order with status 'pending'");
  });

  it("returns 400 when order is already refunded", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RR Already", slug: `${SLUG_PREFIX}already` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refunded" } });

    const res = await request(app)
      .post(`/api/orders/${orderId}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "Already refunded" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cannot refund an order with status 'refunded'");
  });

  it("refunds a paid order successfully", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RR Paid", slug: `${SLUG_PREFIX}paid` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });

    const res = await request(app)
      .post(`/api/orders/${orderId}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "Product not as described" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("refunded");
    const lastEntry = res.body.statusHistory[res.body.statusHistory.length - 1];
    expect(lastEntry.status).toBe("refunded");
    expect(lastEntry.note).toBe("Product not as described");
    expect(lastEntry.changedBy).toBe(customerId);
  });

  it("refunds a fulfilled order within 30-day window", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RR Fulfilled", slug: `${SLUG_PREFIX}fulfilled` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "fulfilled" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "fulfilled", changedBy: adminId },
    });

    const res = await request(app)
      .post(`/api/orders/${orderId}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "Changed my mind" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("refunded");
  });

  it("rejects refund when 30-day window has expired for fulfilled order", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RR Expired", slug: `${SLUG_PREFIX}expired` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "fulfilled" } });

    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "fulfilled", changedBy: adminId, createdAt: thirtyOneDaysAgo },
    });

    const res = await request(app)
      .post(`/api/orders/${orderId}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "Too late" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Refund window has expired (30 days from fulfillment)");
  });

  it("updates payment status to refunded", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RR PayStatus", slug: `${SLUG_PREFIX}pay-status` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });
    await prisma.payment.create({
      data: { orderId, amount: 10, status: "captured", provider: "stripe", providerReference: "pi_test_rr" },
    });

    const res = await request(app)
      .post(`/api/orders/${orderId}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "Refund with payment" });

    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("refunded");
  });

  it("creates a notification for the customer", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RR Notif", slug: `${SLUG_PREFIX}notif` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });

    await request(app)
      .post(`/api/orders/${orderId}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "Notify me" });

    const notification = await prisma.notification.findFirst({
      where: { userId: customerId, type: "order_refunded" },
    });
    expect(notification).not.toBeNull();
    expect(notification!.title).toBe("Your refund has been processed");
  });

  it("includes user info in refund response", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RR UserInfo", slug: `${SLUG_PREFIX}user-info` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });

    const res = await request(app)
      .post(`/api/orders/${orderId}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "Check user info" });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(CUSTOMER_EMAIL);
    expect(res.body.user.firstName).toBe("Customer");
  });

  it("calls sendRefundConfirmationEmail with correct recipient and order data", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RR Email Args", slug: `${SLUG_PREFIX}email-args` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });

    await request(app)
      .post(`/api/orders/${orderId}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "Not what I expected" });

    expect(mockSendRefundConfirmationEmail).toHaveBeenCalledOnce();
    const [toEmail, refundArg] = mockSendRefundConfirmationEmail.mock.calls[0]!;
    expect(toEmail).toBe(CUSTOMER_EMAIL);
    expect(refundArg.orderId).toBe(orderId);
    expect(refundArg.note).toBe("Not what I expected");
    expect(refundArg.totalAmount).toBe("10.00");
    expect(refundArg.items).toHaveLength(1);
    expect(refundArg.items[0].productName).toBe("RR Email Args");
  });

  it("still returns 200 when sendRefundConfirmationEmail throws", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RR Email Err", slug: `${SLUG_PREFIX}email-err` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "paid" } });

    mockSendRefundConfirmationEmail.mockRejectedValue(new Error("SES unavailable"));

    const res = await request(app)
      .post(`/api/orders/${orderId}/refund`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ note: "Changed my mind" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("refunded");
  });
});
