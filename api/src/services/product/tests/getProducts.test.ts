import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "gps-test-";
const ADMIN_EMAIL = "admin@getproducts.test";

let adminId: string;
let adminToken: string;

const makeProduct = <T extends object>(overrides: T): { price: number; previewKey: string; assetKey: string; createdBy: string } & T => ({
  price: 10,
  previewKey: "previews/gps-preview.jpg",
  assetKey: "assets/gps-asset.zip",
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

describe("GET /products", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(401);
  });

  it("returns 200 with an empty array when no products exist", async () => {
    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns active products", async () => {
    await prisma.product.create({
      data: makeProduct({ name: "GPS Active Product", slug: `${SLUG_PREFIX}active` }),
    });

    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const slugs = res.body.map((p: { slug: string }) => p.slug);
    expect(slugs).toContain(`${SLUG_PREFIX}active`);
  });

  it("excludes inactive products", async () => {
    await prisma.product.create({
      data: makeProduct({ name: "GPS Inactive Product", slug: `${SLUG_PREFIX}inactive`, isActive: false }),
    });

    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${adminToken}`);

    const slugs = res.body.map((p: { slug: string }) => p.slug);
    expect(slugs).not.toContain(`${SLUG_PREFIX}inactive`);
  });

  it("returns products with tags and urls included", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "GPS Rich Product", slug: `${SLUG_PREFIX}rich`, price: 25 }),
    });
    const tag = await prisma.tag.upsert({ where: { slug: "gps-tag-one" }, update: {}, create: { name: "gps-tag-one", slug: "gps-tag-one" } });
    await prisma.productTag.create({ data: { productId: product.id, tagId: tag.id } });

    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${adminToken}`);

    const found = res.body.find((p: { slug: string }) => p.slug === `${SLUG_PREFIX}rich`);
    expect(found.tags).toContain("gps-tag-one");
    expect(found.previewUrl).toContain("previews/gps-preview.jpg");

    await prisma.tag.delete({ where: { slug: "gps-tag-one" } });
  });

  it("returns products ordered by createdAt descending", async () => {
    await prisma.product.create({
      data: makeProduct({ name: "GPS First Product", slug: `${SLUG_PREFIX}first`, previewKey: "previews/gps-first.jpg", assetKey: "assets/gps-first.zip" }),
    });
    await prisma.product.create({
      data: makeProduct({ name: "GPS Second Product", slug: `${SLUG_PREFIX}second`, previewKey: "previews/gps-second.jpg", assetKey: "assets/gps-second.zip" }),
    });

    const res = await request(app)
      .get("/api/products")
      .set("Authorization", `Bearer ${adminToken}`);

    const slugs = res.body
      .map((p: { slug: string }) => p.slug)
      .filter((s: string) => s.startsWith(SLUG_PREFIX));

    expect(slugs[0]).toBe(`${SLUG_PREFIX}second`);
    expect(slugs[1]).toBe(`${SLUG_PREFIX}first`);
  });
});
