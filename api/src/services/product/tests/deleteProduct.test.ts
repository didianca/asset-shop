import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "dp-test-";
const ADMIN_EMAIL = "admin@deleteproduct.test";
const CUSTOMER_EMAIL = "customer@deleteproduct.test";

let adminId: string;
let adminToken: string;
let customerToken: string;

const makeProduct = <T extends object>(overrides: T) => ({
  price: 10,
  previewUrl: "https://cdn.example.com/dp-preview.jpg",
  assetUrl: "https://s3.example.com/dp-asset.zip",
  createdBy: adminId,
  ...overrides,
});

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });

  const admin = await prisma.user.create({
    data: { email: ADMIN_EMAIL, passwordHash: "x", firstName: "Admin", lastName: "Test", role: "admin", status: "active" },
  });
  const customer = await prisma.user.create({
    data: { email: CUSTOMER_EMAIL, passwordHash: "x", firstName: "Customer", lastName: "Test", role: "customer", status: "active" },
  });

  adminId = admin.id;
  adminToken = jwt.sign({ id: admin.id, role: "admin", status: "active" }, authConfig.jwtSecret, { expiresIn: "1h" });
  customerToken = jwt.sign({ id: customer.id, role: "customer", status: "active" }, authConfig.jwtSecret, { expiresIn: "1h" });
});

beforeEach(async () => {
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });
  await prisma.$disconnect();
});

describe("DELETE /products/:slug", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).delete(`/products/${SLUG_PREFIX}any`);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer", async () => {
    const res = await request(app)
      .delete(`/products/${SLUG_PREFIX}any`)
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent slug", async () => {
    const res = await request(app)
      .delete(`/products/${SLUG_PREFIX}nonexistent`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for an already inactive product", async () => {
    await prisma.product.create({
      data: makeProduct({ name: "DP Already Deleted", slug: `${SLUG_PREFIX}already-deleted`, isActive: false }),
    });

    const res = await request(app)
      .delete(`/products/${SLUG_PREFIX}already-deleted`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 200 and soft deletes the product", async () => {
    await prisma.product.create({
      data: makeProduct({ name: "DP Active Product", slug: `${SLUG_PREFIX}active` }),
    });

    const res = await request(app)
      .delete(`/products/${SLUG_PREFIX}active`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
  });

  it("sets isActive to false in the database", async () => {
    await prisma.product.create({
      data: makeProduct({ name: "DP Check DB", slug: `${SLUG_PREFIX}checkdb` }),
    });

    await request(app)
      .delete(`/products/${SLUG_PREFIX}checkdb`)
      .set("Authorization", `Bearer ${adminToken}`);

    const product = await prisma.product.findUnique({ where: { slug: `${SLUG_PREFIX}checkdb` } });
    expect(product?.isActive).toBe(false);
  });

  it("does not hard delete the product row", async () => {
    await prisma.product.create({
      data: makeProduct({ name: "DP Preserve Row", slug: `${SLUG_PREFIX}preserve` }),
    });

    await request(app)
      .delete(`/products/${SLUG_PREFIX}preserve`)
      .set("Authorization", `Bearer ${adminToken}`);

    const product = await prisma.product.findUnique({ where: { slug: `${SLUG_PREFIX}preserve` } });
    expect(product).not.toBeNull();
  });
});
