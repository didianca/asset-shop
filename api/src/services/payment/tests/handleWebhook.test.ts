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
const mockGetSignedUrl = vi.hoisted(() => vi.fn());
const mockSendOrderConfirmationEmail = vi.hoisted(() => vi.fn());

vi.mock("stripe", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      paymentIntents: { create: vi.fn() },
      webhooks: { constructEvent: mockConstructEvent },
    })),
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock("../../../lib/email.js", () => ({
  sendOrderConfirmationEmail: mockSendOrderConfirmationEmail,
  sendRefundConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

const makeProduct = <T extends { slug: string }>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: `previews/${overrides.slug}.jpg`,
  assetKey: `assets/${overrides.slug}.zip`,
  createdBy: adminId,
  ...overrides,
});

async function createOrderWithPayment(token: string, productId: string): Promise<{ orderId: string; paymentId: string }> {
  await request(app)
    .post("/api/cart/items")
    .set("Authorization", `Bearer ${token}`)
    .send({ productIds: [productId] });
  const orderRes = await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`);
  const orderId = orderRes.body.id as string;

  const payment = await prisma.payment.create({
    data: { orderId, amount: 10, status: "pending", provider: "stripe", providerReference: "pi_webhook_test" },
  });

  return { orderId, paymentId: payment.id };
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
});

beforeEach(async () => {
  mockConstructEvent.mockReset();
  mockGetSignedUrl.mockReset();
  mockSendOrderConfirmationEmail.mockReset();
  mockGetSignedUrl.mockResolvedValue("https://s3.example.com/presigned-asset.zip");
  mockSendOrderConfirmationEmail.mockResolvedValue(undefined);

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

describe("POST /payments/webhook", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await request(app)
      .post("/api/payments/webhook")
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
      .post("/api/payments/webhook")
      .set("stripe-signature", "bad_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "test" }));
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid signature");
  });

  it("captures payment, sends confirmation email, and fulfills order on payment_intent.succeeded", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Success", slug: `${SLUG_PREFIX}success` }),
    });
    const { orderId } = await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test" } },
    });

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Payment captured");

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    expect(payment!.status).toBe("captured");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order!.status).toBe("fulfilled");

    const statuses = await prisma.orderStatusHistory
      .findMany({ where: { orderId }, orderBy: { createdAt: "asc" } })
      .then((h) => h.map((e) => e.status));
    expect(statuses).toContain("paid");
    expect(statuses).toContain("fulfilled");

    const paidEntry = await prisma.orderStatusHistory.findFirst({ where: { orderId, status: "paid" } });
    expect(paidEntry!.note).toBe("Payment captured via Stripe");

    const fulfilledEntry = await prisma.orderStatusHistory.findFirst({ where: { orderId, status: "fulfilled" } });
    expect(fulfilledEntry!.note).toBe("Download link delivered via email");
  });

  it("sends confirmation email with correct recipient and order data", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Email Args", slug: `${SLUG_PREFIX}email-args` }),
    });
    const { orderId } = await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test" } },
    });

    await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(mockSendOrderConfirmationEmail).toHaveBeenCalledOnce();
    const [toEmail, orderArg] = mockSendOrderConfirmationEmail.mock.calls[0]!;
    expect(toEmail).toBe(CUSTOMER_EMAIL);
    expect(orderArg.id).toBe(orderId);
    expect(orderArg.items).toHaveLength(1);
    expect(orderArg.items[0].productName).toBe("HW Email Args");
    expect(orderArg.items[0].downloadUrl).toBe("https://s3.example.com/presigned-asset.zip");
  });

  it("creates an order_fulfilled notification after successful payment", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Notify", slug: `${SLUG_PREFIX}notify` }),
    });
    const { orderId } = await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test" } },
    });

    await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    const notification = await prisma.notification.findFirst({ where: { userId: customerId } });
    expect(notification!.type).toBe("order_fulfilled");
    expect((notification!.metadata as Record<string, unknown>).orderId).toBe(orderId);
  });

  it("still returns 200 and keeps order as paid when S3 presigned URL fails", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW S3 Fail", slug: `${SLUG_PREFIX}s3-fail` }),
    });
    const { orderId } = await createOrderWithPayment(customerToken, product.id);

    mockGetSignedUrl.mockRejectedValue(new Error("S3 unavailable"));
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test" } },
    });

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Payment captured");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order!.status).toBe("paid");

    const notification = await prisma.notification.findFirst({ where: { userId: customerId } });
    expect(notification).toBeNull();
  });

  it("still returns 200 and keeps order as paid when confirmation email fails", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Email Fail", slug: `${SLUG_PREFIX}email-fail` }),
    });
    const { orderId } = await createOrderWithPayment(customerToken, product.id);

    mockSendOrderConfirmationEmail.mockRejectedValue(new Error("SES unavailable"));
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test" } },
    });

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Payment captured");

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order!.status).toBe("paid");
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
      .post("/api/payments/webhook")
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
      .post("/api/payments/webhook")
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
      .post("/api/payments/webhook")
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
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Already processed");
  });

  it("returns 200 and skips when payment not found on payment_failed", async () => {
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_nonexistent_fail" } },
    });

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.payment_failed" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Payment not found, skipping");
  });

  it("does not change order status on payment_intent.payment_failed", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Fail Order", slug: `${SLUG_PREFIX}fail-order` }),
    });
    const { orderId } = await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_webhook_test" } },
    });

    await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.payment_failed" }));

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order!.status).toBe("pending");
  });

  it("stores metadata on successful payment", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Meta Success", slug: `${SLUG_PREFIX}meta-success` }),
    });
    const { orderId } = await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test", amount: 1000, currency: "usd" } },
    });

    await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    const metadata = payment!.metadata as Record<string, unknown>;
    expect(metadata.id).toBe("pi_webhook_test");
    expect(metadata.amount).toBe(1000);
    expect(metadata.currency).toBe("usd");
  });

  it("stores metadata on failed payment", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Meta Fail", slug: `${SLUG_PREFIX}meta-fail` }),
    });
    const { orderId } = await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_webhook_test", last_payment_error: { message: "Card declined" } } },
    });

    await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.payment_failed" }));

    const payment = await prisma.payment.findUnique({ where: { orderId } });
    const metadata = payment!.metadata as Record<string, unknown>;
    expect(metadata.id).toBe("pi_webhook_test");
    expect((metadata.last_payment_error as Record<string, unknown>).message).toBe("Card declined");
  });

  it("re-throws and returns 500 when the capture transaction fails", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW TX Fail", slug: `${SLUG_PREFIX}tx-fail` }),
    });
    await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test" } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(prisma as any, "$transaction").mockRejectedValueOnce(new Error("DB connection lost"));

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(500);
  });

  it("skips fulfillment and returns 200 when order is not found after capture", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW No Order", slug: `${SLUG_PREFIX}no-order` }),
    });
    await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test" } },
    });

    vi.spyOn(prisma.order, "findUnique").mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Payment captured");
    expect(mockSendOrderConfirmationEmail).not.toHaveBeenCalled();
  });

  it("re-throws and returns 500 when the payment-failed DB update fails", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Update Fail", slug: `${SLUG_PREFIX}update-fail` }),
    });
    await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_webhook_test" } },
    });

    vi.spyOn(prisma.payment, "update").mockRejectedValueOnce(new Error("DB connection lost"));

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.payment_failed" }));

    expect(res.status).toBe(500);
  });

  // TypeScript strict mode types `catch (err)` as `unknown`, requiring an `err instanceof Error`
  // check before accessing `.message`. The false branch (non-Error throwable) is unreachable in
  // practice since Stripe and Prisma always throw Error instances, but must be covered.

  it("returns 400 when signature verification throws a non-Error", async () => {
    mockConstructEvent.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw "bad signature string";
    });

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "bad_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "test" }));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid signature");
  });

  it("re-throws and returns 500 when capture transaction throws a non-Error", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW TX NonError", slug: `${SLUG_PREFIX}tx-non-error` }),
    });
    await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test" } },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(prisma as any, "$transaction").mockRejectedValueOnce("connection lost");

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(500);
  });

  it("still returns 200 when confirmation email throws a non-Error", async () => {
    // Create order and payment directly — avoids $transaction spy leaking from previous test
    // into the POST /api/orders call inside createOrderWithPayment.
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Email NonError", slug: `${SLUG_PREFIX}email-non-error` }),
    });
    const order = await prisma.order.create({
      data: {
        userId: customerId,
        totalAmount: 10,
        items: { create: [{ productId: product.id, unitPrice: 10 }] },
      },
    });
    await prisma.payment.create({
      data: { orderId: order.id, amount: 10, status: "pending", provider: "stripe", providerReference: "pi_webhook_test" },
    });

    mockSendOrderConfirmationEmail.mockRejectedValue("email failed");
    mockConstructEvent.mockReturnValue({
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_webhook_test" } },
    });

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.succeeded" }));

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Payment captured");
  });

  it("re-throws and returns 500 when payment-failed update throws a non-Error", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "HW Update NonError", slug: `${SLUG_PREFIX}update-non-error` }),
    });
    await createOrderWithPayment(customerToken, product.id);

    mockConstructEvent.mockReturnValue({
      type: "payment_intent.payment_failed",
      data: { object: { id: "pi_webhook_test" } },
    });

    vi.spyOn(prisma.payment, "update").mockRejectedValueOnce("update failed");

    const res = await request(app)
      .post("/api/payments/webhook")
      .set("stripe-signature", "valid_sig")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ type: "payment_intent.payment_failed" }));

    expect(res.status).toBe(500);
  });
});
