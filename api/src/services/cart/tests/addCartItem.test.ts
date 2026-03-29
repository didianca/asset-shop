import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "aci-test-";
const ADMIN_EMAIL = "admin@addcartitem.test";
const CUSTOMER_EMAIL = "customer@addcartitem.test";
const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

let adminId: string;
let customerId: string;
let customerToken: string;

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/aci-preview.jpg",
  assetKey: "assets/aci-asset.zip",
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
  await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
  await prisma.cart.deleteMany({ where: { userId: customerId } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { userId: customerId } } });
  await prisma.cart.deleteMany({ where: { userId: customerId } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });
  await prisma.$disconnect();
});

describe("POST /cart/items", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .send({ productIds: [NONEXISTENT_ID] });
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid UUIDs", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productIds: ["not-a-uuid"] });
    expect(res.status).toBe(400);
  });

  it("returns 400 for an empty array", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productIds: [] });
    expect(res.status).toBe(400);
  });

  it("returns 400 for extra fields", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productIds: [NONEXISTENT_ID], extra: true });
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent product", async () => {
    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productIds: [NONEXISTENT_ID] });
    expect(res.status).toBe(404);
  });

  it("returns 404 for an inactive product", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "ACI Inactive", slug: `${SLUG_PREFIX}inactive`, isActive: false }),
    });

    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productIds: [product.id] });
    expect(res.status).toBe(404);
  });

  it("returns 404 when one product in the list does not exist", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "ACI Exists", slug: `${SLUG_PREFIX}exists` }),
    });

    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productIds: [product.id, NONEXISTENT_ID] });
    expect(res.status).toBe(404);
  });

  it("adds a single product to the cart and creates cart if needed", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "ACI Product", slug: `${SLUG_PREFIX}product` }),
    });

    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productIds: [product.id] });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].productId).toBe(product.id);
    expect(res.body.items[0].name).toBe("ACI Product");
    expect(res.body.total).toBe(10);
  });

  it("adds multiple products in a single request", async () => {
    const p1 = await prisma.product.create({
      data: makeProduct({
        name: "ACI Multi 1",
        slug: `${SLUG_PREFIX}multi-1`,
        previewKey: "previews/aci-m1.jpg",
        assetKey: "assets/aci-m1.zip",
      }),
    });
    const p2 = await prisma.product.create({
      data: makeProduct({
        name: "ACI Multi 2",
        slug: `${SLUG_PREFIX}multi-2`,
        price: 20,
        previewKey: "previews/aci-m2.jpg",
        assetKey: "assets/aci-m2.zip",
      }),
    });

    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productIds: [p1.id, p2.id] });

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBe(30);
  });

  it("returns 409 when adding a duplicate product", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "ACI Duplicate", slug: `${SLUG_PREFIX}duplicate` }),
    });

    await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productIds: [product.id] });

    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ productIds: [product.id] });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("One or more products already in cart");
  });

  it("returns 401 when user does not exist in the database", async () => {
    const ghostToken = jwt.sign({ id: "11111111-1111-1111-1111-111111111111", role: "customer", status: "active" }, authConfig.jwtSecret, { expiresIn: "1h" });
    const product = await prisma.product.create({
      data: makeProduct({ name: "ACI Ghost", slug: `${SLUG_PREFIX}ghost` }),
    });

    const res = await request(app)
      .post("/api/cart/items")
      .set("Authorization", `Bearer ${ghostToken}`)
      .send({ productIds: [product.id] });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("User not found");
  });

  it("re-throws unexpected non-P2002 errors", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "ACI Error", slug: `${SLUG_PREFIX}error` }),
    });

    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("Unexpected DB error"));

    await expect(
      request(app)
        .post("/api/cart/items")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ productIds: [product.id] })
    ).resolves.toMatchObject({ status: 500 });

    vi.restoreAllMocks();
  });
});
