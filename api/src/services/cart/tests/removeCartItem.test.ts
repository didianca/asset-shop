import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "rci-test-";
const CUSTOMER_EMAIL = "customer@removecartitem.test";
const ADMIN_EMAIL = "admin@removecartitem.test";
const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

let adminId: string;
let customerId: string;
let customerToken: string;

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/rci-preview.jpg",
  assetKey: "assets/rci-asset.zip",
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

describe("DELETE /cart/items/:productId", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).delete(`/cart/items/${NONEXISTENT_ID}`);
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid productId param", async () => {
    const res = await request(app)
      .delete("/cart/items/not-a-uuid")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(400);
  });

  it("returns 404 when user has no cart", async () => {
    const res = await request(app)
      .delete(`/cart/items/${NONEXISTENT_ID}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Cart not found");
  });

  it("returns 404 when item is not in the cart", async () => {
    await prisma.cart.create({ data: { userId: customerId } });

    const res = await request(app)
      .delete(`/cart/items/${NONEXISTENT_ID}`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Item not in cart");
  });

  it("removes an item from the cart", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "RCI Product", slug: `${SLUG_PREFIX}product` }),
    });
    const cart = await prisma.cart.create({ data: { userId: customerId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: product.id } });

    const res = await request(app)
      .delete(`/cart/items/${product.id}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it("only removes the specified item, keeps the rest", async () => {
    const p1 = await prisma.product.create({
      data: makeProduct({
        name: "RCI Keep",
        slug: `${SLUG_PREFIX}keep`,
        price: 15,
        previewKey: "previews/rci-keep.jpg",
        assetKey: "assets/rci-keep.zip",
      }),
    });
    const p2 = await prisma.product.create({
      data: makeProduct({
        name: "RCI Remove",
        slug: `${SLUG_PREFIX}remove`,
        price: 25,
        previewKey: "previews/rci-remove.jpg",
        assetKey: "assets/rci-remove.zip",
      }),
    });

    const cart = await prisma.cart.create({ data: { userId: customerId } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: p1.id } });
    await prisma.cartItem.create({ data: { cartId: cart.id, productId: p2.id } });

    const res = await request(app)
      .delete(`/cart/items/${p2.id}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].productId).toBe(p1.id);
    expect(res.body.total).toBe(15);
  });
});
