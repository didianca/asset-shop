import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "gc-test-";
const ADMIN_EMAIL = "admin@getcart.test";
const CUSTOMER_EMAIL = "customer@getcart.test";

let adminId: string;
let customerId: string;
let customerToken: string;

const makeProduct = <T extends object>(overrides: T) => ({
  price: 10,
  previewUrl: "https://cdn.example.com/gc-preview.jpg",
  assetUrl: "https://s3.example.com/gc-asset.zip",
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
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [adminId, customerId] } } } });
  await prisma.cart.deleteMany({ where: { userId: { in: [adminId, customerId] } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.cartItem.deleteMany({ where: { cart: { userId: { in: [adminId, customerId] } } } });
  await prisma.cart.deleteMany({ where: { userId: { in: [adminId, customerId] } } });
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });
  await prisma.$disconnect();
});

describe("GET /cart", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/cart");
    expect(res.status).toBe(401);
  });

  it("creates and returns an empty cart for a new user", async () => {
    const res = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("returns existing cart with items", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GC Product", slug: `${SLUG_PREFIX}product`, price: 25 }),
    });
    const cart = await prisma.cart.create({ data: { userId: customerId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id } });

    const res = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].productId).toBe(product.id);
    expect(res.body.items[0].name).toBe("GC Product");
    expect(res.body.items[0].price).toBe(25);
    expect(res.body.total).toBe(25);
  });

  it("calculates total with discounted items", async () => {
    const p1 = await prisma.product.create({
      data: makeProduct({
        name: "GC Discounted",
        slug: `${SLUG_PREFIX}discounted`,
        price: 100,
        discountPercent: 20,
        previewUrl: "https://cdn.example.com/gc-disc-preview.jpg",
        assetUrl: "https://s3.example.com/gc-disc-asset.zip",
      }),
    });
    const p2 = await prisma.product.create({
      data: makeProduct({
        name: "GC Full Price",
        slug: `${SLUG_PREFIX}full`,
        price: 50,
        previewUrl: "https://cdn.example.com/gc-full-preview.jpg",
        assetUrl: "https://s3.example.com/gc-full-asset.zip",
      }),
    });

    const cart = await prisma.cart.create({ data: { userId: customerId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: p1.id } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: p2.id } });

    const res = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    // 100 * 0.80 + 50 = 130
    expect(res.body.total).toBe(130);
  });

  it("returns the same cart on repeated calls (idempotent)", async () => {
    const res1 = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    const res2 = await request(app)
      .get("/cart")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res1.body.id).toBe(res2.body.id);
  });
});
