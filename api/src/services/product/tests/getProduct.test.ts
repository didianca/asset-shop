import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "gp-test-";
const ADMIN_EMAIL = "admin@getproduct.test";
const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

let adminId: string;
let adminToken: string;

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/gp-preview.jpg",
  assetKey: "assets/gp-asset.zip",
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

describe("GET /products/:id", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get(`/api/products/${NONEXISTENT_ID}`);
    expect(res.status).toBe(401);
  });

  it("returns 404 for a non-existent id", async () => {
    const res = await request(app)
      .get(`/api/products/${NONEXISTENT_ID}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for an inactive product", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GP Inactive", slug: `${SLUG_PREFIX}inactive`, isActive: false }),
    });

    const res = await request(app)
      .get(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 200 with the product for an active id", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GP Active Product", slug: `${SLUG_PREFIX}active`, price: 29.99 }),
    });

    const res = await request(app)
      .get(`/api/products/${product.id}`)
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
      .get(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.tags).toContain("gp-tag-one");
    expect(res.body.previewUrl).toContain("previews/gp-preview.jpg");
    expect(res.body.assetUrl).toContain("assets/gp-asset.zip");

    await prisma.tag.delete({ where: { slug: "gp-tag-one" } });
  });

  it("returns bundle as null when product has no bundle", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GP No Bundle", slug: `${SLUG_PREFIX}no-bundle` }),
    });

    const res = await request(app)
      .get(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.bundle).toBeNull();
  });

  it("returns bundle object when product belongs to a bundle", async () => {
    const bundle = await prisma.bundle.create({
      data: { name: "GP Test Bundle", slug: `${SLUG_PREFIX}bundle-parent`, discountPercent: 20, createdBy: adminId },
    });
    const product = await prisma.product.create({
      data: makeProduct({ name: "GP Bundled", slug: `${SLUG_PREFIX}bundled`, bundleId: bundle.id }),
    });

    const res = await request(app)
      .get(`/api/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.bundle).toEqual({
      id: bundle.id,
      name: "GP Test Bundle",
      slug: `${SLUG_PREFIX}bundle-parent`,
      discountPercent: 20,
    });

    await prisma.product.deleteMany({ where: { bundleId: bundle.id } });
    await prisma.bundle.delete({ where: { id: bundle.id } });
  });
});
