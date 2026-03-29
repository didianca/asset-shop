import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "co-test-";
const ADMIN_EMAIL = "admin@createorder.test";
const CUSTOMER_EMAIL = "customer@createorder.test";

let adminId: string;
let customerId: string;
let customerToken: string;

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/co-preview.jpg",
  assetKey: "assets/co-asset.zip",
  createdBy: adminId,
  ...overrides,
});

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

async function addToCart(productIds: string[], token: string): Promise<void> {
  await request(app)
    .post("/cart/items")
    .set("Authorization", `Bearer ${token}`)
    .send({ productIds });
}

describe("POST /orders", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).post("/orders");
    expect(res.status).toBe(401);
  });

  it("returns 400 when user has no cart", async () => {
    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cart is empty");
  });

  it("returns 400 when cart exists but is empty", async () => {
    await prisma.cart.create({ data: { userId: customerId } });

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Cart is empty");
  });

  it("creates an order from a cart with one item", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "CO Single", slug: `${SLUG_PREFIX}single` }),
    });
    await addToCart([product.id], customerToken);

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(201);
    expect(res.body.userId).toBe(customerId);
    expect(res.body.status).toBe("pending");
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].productId).toBe(product.id);
    expect(res.body.items[0].unitPrice).toBe(10);
    expect(res.body.items[0].name).toBe("CO Single");
    expect(res.body.totalAmount).toBe(10);
  });

  it("creates an order from a cart with multiple items", async () => {
    const p1 = await prisma.product.create({
      data: makeProduct({
        name: "CO Multi 1",
        slug: `${SLUG_PREFIX}multi-1`,
        previewKey: "previews/co-m1.jpg",
        assetKey: "assets/co-m1.zip",
      }),
    });
    const p2 = await prisma.product.create({
      data: makeProduct({
        name: "CO Multi 2",
        slug: `${SLUG_PREFIX}multi-2`,
        price: 25,
        previewKey: "previews/co-m2.jpg",
        assetKey: "assets/co-m2.zip",
      }),
    });
    await addToCart([p1.id, p2.id], customerToken);

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.totalAmount).toBe(35);
  });

  it("snapshots effective price when product has a discount", async () => {
    const product = await prisma.product.create({
      data: makeProduct({
        name: "CO Discount",
        slug: `${SLUG_PREFIX}discount`,
        price: 100,
        discountPercent: 20,
      }),
    });
    await addToCart([product.id], customerToken);

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(201);
    expect(res.body.items[0].unitPrice).toBe(80);
    expect(res.body.totalAmount).toBe(80);
  });

  it("clears the cart after order creation", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "CO Clear", slug: `${SLUG_PREFIX}clear` }),
    });
    await addToCart([product.id], customerToken);

    const orderRes = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(orderRes.status).toBe(201);

    const cartRes = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(cartRes.body.items).toHaveLength(0);
  });

  it("creates an initial status history entry with pending status", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "CO History", slug: `${SLUG_PREFIX}history` }),
    });
    await addToCart([product.id], customerToken);

    const res = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(201);
    expect(res.body.statusHistory).toHaveLength(1);
    expect(res.body.statusHistory[0].status).toBe("pending");
    expect(res.body.statusHistory[0].changedBy).toBe(customerId);
    expect(res.body.statusHistory[0].note).toBe("Order created");
  });

  it("allows purchasing the same product in a separate order", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "CO Repurchase", slug: `${SLUG_PREFIX}repurchase` }),
    });

    await addToCart([product.id], customerToken);
    const first = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(first.status).toBe(201);

    await addToCart([product.id], customerToken);
    const second = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(second.status).toBe(201);
    expect(second.body.id).not.toBe(first.body.id);
  });

  it("re-throws unexpected errors", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "CO Error", slug: `${SLUG_PREFIX}error` }),
    });
    await addToCart([product.id], customerToken);

    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("Unexpected DB error"));

    await expect(
      request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${customerToken}`)
    ).resolves.toMatchObject({ status: 500 });

    vi.restoreAllMocks();
  });
});
