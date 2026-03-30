import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "go-test-";
const ADMIN_EMAIL = "admin@getorders.test";
const CUSTOMER_EMAIL = "customer@getorders.test";
const CUSTOMER2_EMAIL = "customer2@getorders.test";

let adminId: string;
let customerId: string;
let customer2Id: string;
let adminToken: string;
let customerToken: string;
let customer2Token: string;

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/go-preview.jpg",
  assetKey: "assets/go-asset.zip",
  createdBy: adminId,
  ...overrides,
});

async function createOrderForUser(token: string, productId: string): Promise<void> {
  await request(app)
    .post("/api/cart/items")
    .set("Authorization", `Bearer ${token}`)
    .send({ productIds: [productId] });
  await request(app)
    .post("/api/orders")
    .set("Authorization", `Bearer ${token}`);
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

describe("GET /orders", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("returns empty array when customer has no orders", async () => {
    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(0);
    expect(res.body.total).toBe(0);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
  });

  it("returns customer's own orders sorted by createdAt desc", async () => {
    const p1 = await prisma.product.create({
      data: makeProduct({ name: "GO Order 1", slug: `${SLUG_PREFIX}order-1` }),
    });
    const p2 = await prisma.product.create({
      data: makeProduct({
        name: "GO Order 2",
        slug: `${SLUG_PREFIX}order-2`,
        previewKey: "previews/go-p2.jpg",
        assetKey: "assets/go-p2.zip",
      }),
    });

    await createOrderForUser(customerToken, p1.id);
    await createOrderForUser(customerToken, p2.id);

    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(2);
    expect(res.body.total).toBe(2);
    const dates = res.body.orders.map((o: { createdAt: string }) => new Date(o.createdAt).getTime());
    expect(dates[0]).toBeGreaterThanOrEqual(dates[1]);
  });

  it("customer cannot see other users' orders", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GO Other", slug: `${SLUG_PREFIX}other` }),
    });

    await createOrderForUser(customer2Token, product.id);

    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(0);
    expect(res.body.total).toBe(0);
  });

  it("admin sees all orders", async () => {
    const p1 = await prisma.product.create({
      data: makeProduct({ name: "GO Admin 1", slug: `${SLUG_PREFIX}admin-1` }),
    });
    const p2 = await prisma.product.create({
      data: makeProduct({
        name: "GO Admin 2",
        slug: `${SLUG_PREFIX}admin-2`,
        previewKey: "previews/go-a2.jpg",
        assetKey: "assets/go-a2.zip",
      }),
    });

    await createOrderForUser(customerToken, p1.id);
    await createOrderForUser(customer2Token, p2.id);

    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBeGreaterThanOrEqual(2);
    const userIds = res.body.orders.map((o: { userId: string }) => o.userId);
    expect(userIds).toContain(customerId);
    expect(userIds).toContain(customer2Id);
  });

  it("admin can filter by userId", async () => {
    const p1 = await prisma.product.create({
      data: makeProduct({ name: "GO Filter 1", slug: `${SLUG_PREFIX}filter-1` }),
    });
    const p2 = await prisma.product.create({
      data: makeProduct({
        name: "GO Filter 2",
        slug: `${SLUG_PREFIX}filter-2`,
        previewKey: "previews/go-f2.jpg",
        assetKey: "assets/go-f2.zip",
      }),
    });

    await createOrderForUser(customerToken, p1.id);
    await createOrderForUser(customer2Token, p2.id);

    const res = await request(app)
      .get(`/api/orders?userId=${customerId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].userId).toBe(customerId);
  });

  it("customer ignores userId filter and sees only own orders", async () => {
    const p1 = await prisma.product.create({
      data: makeProduct({ name: "GO Ignore 1", slug: `${SLUG_PREFIX}ignore-1` }),
    });
    const p2 = await prisma.product.create({
      data: makeProduct({
        name: "GO Ignore 2",
        slug: `${SLUG_PREFIX}ignore-2`,
        previewKey: "previews/go-i2.jpg",
        assetKey: "assets/go-i2.zip",
      }),
    });

    await createOrderForUser(customerToken, p1.id);
    await createOrderForUser(customer2Token, p2.id);

    const res = await request(app)
      .get(`/api/orders?userId=${customer2Id}`)
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
    expect(res.body.orders[0].userId).toBe(customerId);
  });

  it("pagination works correctly", async () => {
    const products = await Promise.all(
      [1, 2, 3].map((i) =>
        prisma.product.create({
          data: makeProduct({
            name: `GO Page ${i}`,
            slug: `${SLUG_PREFIX}page-${i}`,
            previewKey: `previews/go-pg-${i}.jpg`,
            assetKey: `assets/go-pg-${i}.zip`,
          }),
        })
      )
    );

    for (const p of products) {
      await createOrderForUser(customerToken, p.id);
    }

    const page1 = await request(app)
      .get("/api/orders?page=1&limit=2")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(page1.status).toBe(200);
    expect(page1.body.orders).toHaveLength(2);
    expect(page1.body.total).toBe(3);
    expect(page1.body.page).toBe(1);
    expect(page1.body.limit).toBe(2);

    const page2 = await request(app)
      .get("/api/orders?page=2&limit=2")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(page2.status).toBe(200);
    expect(page2.body.orders).toHaveLength(1);
  });

  it("returns 400 for invalid query params", async () => {
    const res = await request(app)
      .get("/api/orders?page=0")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid query parameters");
  });

  it("includes user info in order response", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GO User Info", slug: `${SLUG_PREFIX}user-info` }),
    });
    await createOrderForUser(customerToken, product.id);

    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
    const order = res.body.orders.find((o: { userId: string }) => o.userId === customerId);
    expect(order.user).toBeDefined();
    expect(order.user.email).toBe(CUSTOMER_EMAIL);
    expect(order.user.firstName).toBe("Customer");
    expect(order.user.lastName).toBe("Test");
  });
});
