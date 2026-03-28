import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "gp-test-";
const ADMIN_EMAIL = "admin@getproduct.test";

let adminId: string;
let adminToken: string;

const makeProduct = <T extends object>(overrides: T) => ({
  price: 10,
  previewUrl: "https://cdn.example.com/gp-preview.jpg",
  assetUrl: "https://s3.example.com/gp-asset.zip",
  createdBy: adminId,
  ...overrides,
});

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });

  const admin = await prisma.user.create({
    data: { email: ADMIN_EMAIL, passwordHash: "x", firstName: "Admin", lastName: "Test", role: "admin", status: "active" },
  });
  adminId = admin.id;
  adminToken = jwt.sign({ id: admin.id, role: "admin", status: "active" }, authConfig.jwtSecret, { expiresIn: "1h" });
});

beforeEach(async () => {
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });
  await prisma.$disconnect();
});

describe("GET /products/:slug", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get(`/products/${SLUG_PREFIX}anything`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for a non-existent slug", async () => {
    const res = await request(app)
      .get(`/products/${SLUG_PREFIX}nonexistent`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for an inactive product", async () => {
    await prisma.product.create({
      data: makeProduct({ name: "GP Inactive", slug: `${SLUG_PREFIX}inactive`, isActive: false }),
    });

    const res = await request(app)
      .get(`/products/${SLUG_PREFIX}inactive`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 200 with the product for an active slug", async () => {
    await prisma.product.create({
      data: makeProduct({ name: "GP Active Product", slug: `${SLUG_PREFIX}active`, price: 29.99 }),
    });

    const res = await request(app)
      .get(`/products/${SLUG_PREFIX}active`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.slug).toBe(`${SLUG_PREFIX}active`);
    expect(res.body.price).toBe(29.99);
    expect(res.body.isActive).toBe(true);
  });

  it("returns tags and urls in the response", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GP Rich Product", slug: `${SLUG_PREFIX}rich`, price: 15 }),
    });
    const tag = await prisma.tag.upsert({ where: { slug: "gp-tag-one" }, update: {}, create: { name: "gp-tag-one", slug: "gp-tag-one" } });
    await prisma.productTag.create({ data: { productId: product.id, tagId: tag.id } });

    const res = await request(app)
      .get(`/products/${SLUG_PREFIX}rich`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tags).toContain("gp-tag-one");
    expect(res.body.previewUrl).toBe("https://cdn.example.com/gp-preview.jpg");
    expect(res.body.assetUrl).toBe("https://s3.example.com/gp-asset.zip");

    await prisma.tag.delete({ where: { slug: "gp-tag-one" } });
  });
});
