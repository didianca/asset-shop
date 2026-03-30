import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "cc-test-";
const CUSTOMER_EMAIL = "customer@clearcart.test";
const ADMIN_EMAIL = "admin@clearcart.test";

let adminId: string;
let customerId: string;
let customerToken: string;

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/cc-preview.jpg",
  assetKey: "assets/cc-asset.zip",
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

describe("DELETE /cart", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).delete("/api/cart");
    expect(res.status).toBe(401);
  });

  it("returns 404 when user has no cart", async () => {
    const res = await request(app)
      .delete("/api/cart")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Cart not found");
  });

  it("clears all items from the cart", async () => {
    const p1 = await prisma.product.create({
      data: makeProduct({
        name: "CC Product 1",
        slug: `${SLUG_PREFIX}product-1`,
        previewKey: "previews/cc-p1.jpg",
        assetKey: "assets/cc-p1.zip",
      }),
    });
    const p2 = await prisma.product.create({
      data: makeProduct({
        name: "CC Product 2",
        slug: `${SLUG_PREFIX}product-2`,
        previewKey: "previews/cc-p2.jpg",
        assetKey: "assets/cc-p2.zip",
      }),
    });

    const cart = await prisma.cart.create({ data: { userId: customerId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: p1.id } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: p2.id } });

    const res = await request(app)
      .delete("/api/cart")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
    expect(res.body.id).toBe(cart.id);
  });

  it("returns empty cart when cart already has no items", async () => {
    const cart = await prisma.cart.create({ data: { userId: customerId } });

    const res = await request(app)
      .delete("/api/cart")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.id).toBe(cart.id);
  });
});
