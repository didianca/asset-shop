import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "gbu-test-";
const ADMIN_EMAIL = "admin@getbundle.test";

let adminId: string;
let adminToken: string;

const makeBundle = <T extends object>(overrides: T) => ({
  name: "GBU Test Bundle",
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

describe("GET /bundles/:id", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/bundles/00000000-0000-0000-0000-000000000000");
    expect(res.status).toBe(401);
  });

  it("returns 400 for a non-UUID id", async () => {
    const res = await request(app)
      .get("/api/bundles/not-a-uuid")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent bundle", async () => {
    const res = await request(app)
      .get("/api/bundles/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 404 for an inactive bundle", async () => {
    const bundle = await prisma.bundle.create({
      data: makeBundle({ name: "GBU Inactive Bundle", slug: `${SLUG_PREFIX}inactive`, isActive: false }),
    });

    const res = await request(app)
      .get(`/api/bundles/${bundle.id}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it("returns 200 with the bundle", async () => {
    const bundle = await prisma.bundle.create({
      data: makeBundle({ name: "GBU Active Bundle", slug: `${SLUG_PREFIX}active`, discountPercent: 10 }),
    });

    const res = await request(app)
      .get(`/api/bundles/${bundle.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(bundle.id);
    expect(res.body.name).toBe("GBU Active Bundle");
    expect(res.body.slug).toBe(`${SLUG_PREFIX}active`);
    expect(res.body.discountPercent).toBe(10);
    expect(res.body.isActive).toBe(true);
    expect(res.body.products).toEqual([]);
    expect(res.body.createdAt).toBeDefined();
  });

  it("returns the bundle with its products", async () => {
    const bundle = await prisma.bundle.create({
      data: makeBundle({ name: "GBU Bundle With Products", slug: `${SLUG_PREFIX}with-products` }),
    });
    await prisma.product.create({
      data: makeProduct({ name: "GBU Product", slug: `${SLUG_PREFIX}product`, bundleId: bundle.id }),
    });

    const res = await request(app)
      .get(`/api/bundles/${bundle.id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].name).toBe("GBU Product");
    expect(res.body.products[0].previewUrl).toBeDefined();
  });
});
