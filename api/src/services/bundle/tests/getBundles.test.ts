import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "gbs-test-";
const ADMIN_EMAIL = "admin@getbundles.test";

let adminId: string;
let adminToken: string;

const makeBundle = <T extends object>(overrides: T) => ({
  name: "GBS Test Bundle",
  slug: `${SLUG_PREFIX}bundle`,
  createdBy: adminId,
  ...overrides,
});

const makeProduct = <T extends object>(overrides: T) => ({
  price: 15,
  previewKey: `previews/${SLUG_PREFIX}preview.jpg`,
  assetKey: `assets/${SLUG_PREFIX}asset.zip`,
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
  await prisma.bundle.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.bundle.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });
  await prisma.$disconnect();
});

describe("GET /bundles", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/bundles");
    expect(res.status).toBe(401);
  });

  it("returns 200 with an empty array when no bundles exist", async () => {
    const res = await request(app)
      .get("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns active bundles", async () => {
    await prisma.bundle.create({ data: makeBundle({ name: "GBS Active Bundle", slug: `${SLUG_PREFIX}active` }) });

    const res = await request(app)
      .get("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const slugs = res.body.map((b: { slug: string }) => b.slug);
    expect(slugs).toContain(`${SLUG_PREFIX}active`);
  });

  it("excludes inactive bundles", async () => {
    await prisma.bundle.create({ data: makeBundle({ name: "GBS Inactive Bundle", slug: `${SLUG_PREFIX}inactive`, isActive: false }) });

    const res = await request(app)
      .get("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`);

    const slugs = res.body.map((b: { slug: string }) => b.slug);
    expect(slugs).not.toContain(`${SLUG_PREFIX}inactive`);
  });

  it("returns bundles ordered by createdAt descending", async () => {
    await prisma.bundle.create({ data: makeBundle({ name: "GBS First Bundle", slug: `${SLUG_PREFIX}first` }) });
    await prisma.bundle.create({ data: makeBundle({ name: "GBS Second Bundle", slug: `${SLUG_PREFIX}second` }) });

    const res = await request(app)
      .get("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`);

    const slugs = res.body
      .map((b: { slug: string }) => b.slug)
      .filter((s: string) => s.startsWith(SLUG_PREFIX));

    expect(slugs[0]).toBe(`${SLUG_PREFIX}second`);
    expect(slugs[1]).toBe(`${SLUG_PREFIX}first`);
  });

  it("returns bundles with their products", async () => {
    const bundle = await prisma.bundle.create({ data: makeBundle({ name: "GBS Bundle With Products", slug: `${SLUG_PREFIX}with-products` }) });
    await prisma.product.create({
      data: makeProduct({ name: "GBS Product One", slug: `${SLUG_PREFIX}product-one`, bundleId: bundle.id }),
    });

    const res = await request(app)
      .get("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`);

    const found = res.body.find((b: { slug: string }) => b.slug === `${SLUG_PREFIX}with-products`);
    expect(found.products).toHaveLength(1);
    expect(found.products[0].slug).toBe(`${SLUG_PREFIX}product-one`);
    expect(found.products[0].previewUrl).toContain(`previews/${SLUG_PREFIX}preview.jpg`);
  });

  it("excludes isBundle products from the products list", async () => {
    const bundle = await prisma.bundle.create({ data: makeBundle({ name: "GBS Bundle For Exclusion", slug: `${SLUG_PREFIX}exclusion` }) });
    await prisma.product.create({
      data: makeProduct({
        name: "GBS Bundle Product Row",
        slug: `${SLUG_PREFIX}bundle-row`,
        previewKey: `previews/${SLUG_PREFIX}bundle-row.jpg`,
        assetKey: `assets/${SLUG_PREFIX}bundle-row.zip`,
        bundleId: bundle.id,
        isBundle: true,
      }),
    });

    const res = await request(app)
      .get("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`);

    const found = res.body.find((b: { slug: string }) => b.slug === `${SLUG_PREFIX}exclusion`);
    expect(found.products).toHaveLength(0);
  });

  it("returns empty products array when bundle has no products", async () => {
    await prisma.bundle.create({ data: makeBundle({ name: "GBS Empty Bundle", slug: `${SLUG_PREFIX}empty` }) });

    const res = await request(app)
      .get("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`);

    const found = res.body.find((b: { slug: string }) => b.slug === `${SLUG_PREFIX}empty`);
    expect(found.products).toEqual([]);
  });
});
