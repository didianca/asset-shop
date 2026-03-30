import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const mockSendRefundConfirmationEmail = vi.hoisted(() => vi.fn());
const mockSendRefundDeniedEmail = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/email.js", () => ({
  sendRefundConfirmationEmail: mockSendRefundConfirmationEmail,
  sendRefundDeniedEmail: mockSendRefundDeniedEmail,
}));

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
    .post("/api/cart/items")
    .set("Authorization", `Bearer ${token}`)
    .send({ productIds: [productId] });
  const res = await request(app)
    .post("/api/orders")
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
  mockSendRefundConfirmationEmail.mockReset();
  mockSendRefundConfirmationEmail.mockResolvedValue(undefined);
  mockSendRefundDeniedEmail.mockReset();
  mockSendRefundDeniedEmail.mockResolvedValue(undefined);

  await prisma.notification.deleteMany({ where: { userId: { in: [customerId, adminId] } } });
  await prisma.payment.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.orderStatusHistory.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.orderItem.deleteMany({ where: { order: { userId: { in: [customerId, adminId] } } } });
  await prisma.order.deleteMany({ where: { userId: { in: [customerId, adminId] } } });
  await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
  await prisma.cart.deleteMany({ where: { userId: customerId } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.notification.deleteMany({ where: { userId: { in: [customerId, adminId] } } });
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

describe("PATCH /orders/:id/status", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app)
      .patch(`/api/orders/${NONEXISTENT_ID}/status`)
      .send({ status: "paid" });
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin users", async () => {
    const res = await request(app)
      .patch(`/api/orders/${NONEXISTENT_ID}/status`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ status: "paid" });
    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent order", async () => {
    const res = await request(app)
      .patch(`/api/orders/${NONEXISTENT_ID}/status`)
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
      .patch(`/api/orders/${orderId}/status`)
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
      .patch(`/api/orders/${orderId}/status`)
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
      .patch(`/api/orders/${orderId}/status`)
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
      .patch(`/api/orders/${orderId}/status`)
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
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid" });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "fulfilled" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("fulfilled");
    expect(res.body.statusHistory).toHaveLength(3);
  });

  it("transitions refund_pending -> refunded (admin approves refund)", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Approve", slug: `${SLUG_PREFIX}approve` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refund_pending" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "refund_pending", note: "Product not as described", changedBy: customerId },
    });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "refunded", note: "Refund approved" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("refunded");
    const lastEntry = res.body.statusHistory[res.body.statusHistory.length - 1];
    expect(lastEntry.status).toBe("refunded");
    expect(lastEntry.note).toBe("Refund approved");
  });

  it("sends refund confirmation email when approving refund", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Email", slug: `${SLUG_PREFIX}email` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refund_pending" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "refund_pending", note: "Not what I expected", changedBy: customerId },
    });

    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "refunded" });

    expect(mockSendRefundConfirmationEmail).toHaveBeenCalledOnce();
    const [toEmail, refundArg] = mockSendRefundConfirmationEmail.mock.calls[0]!;
    expect(toEmail).toBe(CUSTOMER_EMAIL);
    expect(refundArg.orderId).toBe(orderId);
    expect(refundArg.note).toBe("Not what I expected");
    expect(refundArg.totalAmount).toBe("10.00");
    expect(refundArg.items).toHaveLength(1);
    expect(refundArg.items[0].productName).toBe("UOS Email");
  });

  it("creates a notification when approving refund", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Notif", slug: `${SLUG_PREFIX}notif` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refund_pending" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "refund_pending", note: "Reason", changedBy: customerId },
    });

    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "refunded" });

    const notification = await prisma.notification.findFirst({
      where: { userId: customerId, type: "order_refunded" },
    });
    expect(notification).not.toBeNull();
    expect(notification!.title).toBe("Your refund has been processed");
  });

  it("updates payment status to refunded when approving refund", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS PayRefund", slug: `${SLUG_PREFIX}pay-refund` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refund_pending" } });
    await prisma.payment.create({
      data: { orderId, amount: 10, status: "captured", provider: "stripe", providerReference: "pi_test_refund" },
    });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "refund_pending", note: "Reason", changedBy: customerId },
    });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "refunded" });

    expect(res.status).toBe(200);
    expect(res.body.payment.status).toBe("refunded");
  });

  it("still returns 200 when email throws during refund approval", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS EmailErr", slug: `${SLUG_PREFIX}email-err` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refund_pending" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "refund_pending", note: "Reason", changedBy: customerId },
    });

    mockSendRefundConfirmationEmail.mockRejectedValue(new Error("SES unavailable"));

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "refunded" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("refunded");
  });

  it("transitions refund_pending -> paid (admin rejects refund)", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS RejectPaid", slug: `${SLUG_PREFIX}reject-paid` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refund_pending" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "refund_pending", note: "Reason", changedBy: customerId },
    });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid", note: "Refund denied — product is correct" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("paid");
    expect(mockSendRefundConfirmationEmail).not.toHaveBeenCalled();
  });

  it("transitions refund_pending -> fulfilled (admin rejects refund)", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS RejectFul", slug: `${SLUG_PREFIX}reject-ful` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refund_pending" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "refund_pending", note: "Reason", changedBy: customerId },
    });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "fulfilled", note: "Refund denied" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("fulfilled");
    expect(mockSendRefundConfirmationEmail).not.toHaveBeenCalled();
  });

  it("sends refund denied email when denying refund", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS DenyEmail", slug: `${SLUG_PREFIX}deny-email` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refund_pending" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "refund_pending", note: "Product not as described", changedBy: customerId },
    });

    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid", note: "Refund denied per policy" });

    expect(mockSendRefundDeniedEmail).toHaveBeenCalledOnce();
    const [toEmail, deniedArg] = mockSendRefundDeniedEmail.mock.calls[0]!;
    expect(toEmail).toBe(CUSTOMER_EMAIL);
    expect(deniedArg.orderId).toBe(orderId);
    expect(deniedArg.customerNote).toBe("Product not as described");
    expect(deniedArg.adminNote).toBe("Refund denied per policy");
  });

  it("creates a notification when denying refund", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS DenyNotif", slug: `${SLUG_PREFIX}deny-notif` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refund_pending" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "refund_pending", note: "Reason", changedBy: customerId },
    });

    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid", note: "Not eligible" });

    const notification = await prisma.notification.findFirst({
      where: { userId: customerId, type: "refund_denied" },
    });
    expect(notification).not.toBeNull();
    expect(notification!.title).toBe("Your refund request has been denied");
  });

  it("still returns 200 when email throws during refund denial", async () => {
    mockSendRefundDeniedEmail.mockRejectedValue(new Error("SES unavailable"));
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS DenyErr", slug: `${SLUG_PREFIX}deny-err` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refund_pending" } });
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "refund_pending", note: "Reason", changedBy: customerId },
    });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("paid");
  });

  it("rejects direct paid -> refunded (must go through refund_pending)", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Direct", slug: `${SLUG_PREFIX}direct` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid" });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "refunded" });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid transition from 'paid' to 'refunded'");
  });

  it("rejects refund approval when 30-day window has expired", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Expired", slug: `${SLUG_PREFIX}expired` }),
    });
    const orderId = await createOrder(customerToken, product.id);
    await prisma.order.update({ where: { id: orderId }, data: { status: "refund_pending" } });

    const thirtyOneDaysAgo = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await prisma.orderStatusHistory.create({
      data: { orderId, status: "fulfilled", changedBy: adminId, createdAt: thirtyOneDaysAgo },
    });

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
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
      .patch(`/api/orders/${orderId}/status`)
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

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "pending" });

    expect(res.status).toBe(400);
  });

  it("creates history entry with note and changedBy", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UOS Note", slug: `${SLUG_PREFIX}note` }),
    });
    const orderId = await createOrder(customerToken, product.id);

    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "paid", note: "Payment confirmed via Stripe" });

    expect(res.status).toBe(200);
    const lastEntry = res.body.statusHistory[res.body.statusHistory.length - 1];
    expect(lastEntry.status).toBe("paid");
    expect(lastEntry.note).toBe("Payment confirmed via Stripe");
    expect(lastEntry.changedBy).toBe(adminId);
  });
});
