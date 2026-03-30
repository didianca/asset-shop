import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "ub-test-";
const ADMIN_EMAIL = "admin@updatebundle.test";
const CUSTOMER_EMAIL = "customer@updatebundle.test";

let adminId: string;
let adminToken: string;
let customerToken: string;

const makeBundle = <T extends object>(overrides: T) => ({
  name: "UB Test Bundle",
  slug: `${SLUG_PREFIX}bundle`,
  createdBy: adminId,
  ...overrides,
});

const makeProduct = <T extends object>(overrides: T) => ({
  price: 20,
  previewKey: `previews/${SLUG_PREFIX}preview.jpg`,
  assetKey: `assets/${SLUG_PREFIX}asset.zip`,
  createdBy: adminId,
  ...overrides,
});

const validUpdate = {
  name: "UB Updated Bundle",
  slug: `${SLUG_PREFIX}updated`,
  description: null,
  discountPercent: null,
  isActive: true,
  productIds: [] as string[],
};

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
  await prisma.bundle.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.bundle.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });
  await prisma.$disconnect();
});

describe("PUT /bundles/:id", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app)
      .put("/api/bundles/00000000-0000-0000-0000-000000000000")
      .send(validUpdate);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer", async () => {
    const res = await request(app)
      .put("/api/bundles/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${customerToken}`)
      .send(validUpdate);
    expect(res.status).toBe(403);
  });

  it("returns 400 for a non-UUID id", async () => {
    const res = await request(app)
      .put("/api/bundles/not-a-uuid")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validUpdate);
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent bundle", async () => {
    const res = await request(app)
      .put("/api/bundles/00000000-0000-0000-0000-000000000000")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validUpdate);
    expect(res.status).toBe(404);
  });

  it("returns 400 for missing required fields", async () => {
    const bundle = await prisma.bundle.create({ data: makeBundle({ name: "UB Validation Bundle", slug: `${SLUG_PREFIX}validation` }) });

    const res = await request(app)
      .put(`/api/bundles/${bundle.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Missing fields" });
    expect(res.status).toBe(400);
  });

  it("returns 200 and the updated bundle", async () => {
    const bundle = await prisma.bundle.create({ data: makeBundle({ name: "UB Original Bundle", slug: `${SLUG_PREFIX}original` }) });

    const res = await request(app)
      .put(`/api/bundles/${bundle.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validUpdate, name: "UB Updated Name", slug: `${SLUG_PREFIX}updated`, description: "Updated desc", discountPercent: 25 });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("UB Updated Name");
    expect(res.body.slug).toBe(`${SLUG_PREFIX}updated`);
    expect(res.body.description).toBe("Updated desc");
    expect(res.body.discountPercent).toBe(25);
    expect(res.body.isActive).toBe(true);
  });

  it("can deactivate a bundle", async () => {
    const bundle = await prisma.bundle.create({ data: makeBundle({ name: "UB Deactivate Bundle", slug: `${SLUG_PREFIX}deactivate` }) });

    const res = await request(app)
      .put(`/api/bundles/${bundle.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validUpdate, name: "UB Deactivate Bundle", slug: `${SLUG_PREFIX}deactivate`, isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it("assigns products to the bundle", async () => {
    const bundle = await prisma.bundle.create({ data: makeBundle({ name: "UB Assign Bundle", slug: `${SLUG_PREFIX}assign` }) });
    const product = await prisma.product.create({
      data: makeProduct({ name: "UB Product", slug: `${SLUG_PREFIX}product` }),
    });

    const res = await request(app)
      .put(`/api/bundles/${bundle.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validUpdate, name: "UB Assign Bundle", slug: `${SLUG_PREFIX}assign`, productIds: [product.id] });

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].id).toBe(product.id);

    const updated = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updated?.bundleId).toBe(bundle.id);
  });

  it("removes products no longer in the bundle", async () => {
    const bundle = await prisma.bundle.create({ data: makeBundle({ name: "UB Remove Bundle", slug: `${SLUG_PREFIX}remove` }) });
    const product = await prisma.product.create({
      data: makeProduct({ name: "UB Remove Product", slug: `${SLUG_PREFIX}remove-product`, bundleId: bundle.id }),
    });

    const res = await request(app)
      .put(`/api/bundles/${bundle.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validUpdate, name: "UB Remove Bundle", slug: `${SLUG_PREFIX}remove`, productIds: [] });

    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(0);

    const updated = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updated?.bundleId).toBeNull();
  });

  it("returns 400 when a productId does not exist", async () => {
    const bundle = await prisma.bundle.create({ data: makeBundle({ name: "UB Bad Product Bundle", slug: `${SLUG_PREFIX}bad-product` }) });

    const res = await request(app)
      .put(`/api/bundles/${bundle.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validUpdate, name: "UB Bad Product Bundle", slug: `${SLUG_PREFIX}bad-product`, productIds: ["00000000-0000-0000-0000-000000000000"] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("product IDs not found");
  });

  it("returns 409 for a duplicate name", async () => {
    await prisma.bundle.create({ data: makeBundle({ name: "UB Existing Bundle", slug: `${SLUG_PREFIX}existing` }) });
    const bundle = await prisma.bundle.create({ data: makeBundle({ name: "UB Another Bundle", slug: `${SLUG_PREFIX}another` }) });

    const res = await request(app)
      .put(`/api/bundles/${bundle.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validUpdate, name: "UB Existing Bundle", slug: `${SLUG_PREFIX}new-slug` });

    expect(res.status).toBe(409);
  });

  it("re-throws unexpected non-P2002 errors", async () => {
    const bundle = await prisma.bundle.create({ data: makeBundle({ name: "UB Error Bundle", slug: `${SLUG_PREFIX}error` }) });
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("Unexpected DB error"));

    await expect(
      request(app)
        .put(`/api/bundles/${bundle.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ ...validUpdate, name: "UB Error Bundle", slug: `${SLUG_PREFIX}error` })
    ).resolves.toMatchObject({ status: 500 });

    vi.restoreAllMocks();
  });
});
