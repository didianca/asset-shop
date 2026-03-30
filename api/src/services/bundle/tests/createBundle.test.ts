import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "cb-test-";
const ADMIN_EMAIL = "admin@createbundle.test";
const CUSTOMER_EMAIL = "customer@createbundle.test";

let adminId: string;
let adminToken: string;
let customerToken: string;

const validBundle = {
  name: "CB Test Bundle",
  slug: `${SLUG_PREFIX}bundle`,
};

const makeProduct = <T extends object>(overrides: T) => ({
  price: 20,
  previewKey: `previews/${SLUG_PREFIX}preview.jpg`,
  assetKey: `assets/${SLUG_PREFIX}asset.zip`,
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
  await prisma.bundle.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.bundle.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });
  await prisma.$disconnect();
});

describe("POST /bundles", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).post("/api/bundles").send(validBundle);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer", async () => {
    const res = await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${customerToken}`)
      .send(validBundle);
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Missing slug" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for discountPercent out of range", async () => {
    const res = await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validBundle, discountPercent: 101 });
    expect(res.status).toBe(400);
  });

  it("returns 201 and the created bundle", async () => {
    const res = await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validBundle, description: "Test desc", discountPercent: 15 });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe(validBundle.name);
    expect(res.body.slug).toBe(validBundle.slug);
    expect(res.body.description).toBe("Test desc");
    expect(res.body.discountPercent).toBe(15);
    expect(res.body.isActive).toBe(true);
    expect(res.body.products).toEqual([]);
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it("creates the bundle in the database", async () => {
    await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validBundle);

    const bundle = await prisma.bundle.findUnique({ where: { slug: validBundle.slug } });
    expect(bundle).not.toBeNull();
    expect(bundle?.isActive).toBe(true);
  });

  it("creates bundle with products and links them", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "CB Product One", slug: `${SLUG_PREFIX}product-one` }),
    });

    const res = await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validBundle, productIds: [product.id] });

    expect(res.status).toBe(201);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.products[0].id).toBe(product.id);

    const updated = await prisma.product.findUnique({ where: { id: product.id } });
    expect(updated?.bundleId).toBe(res.body.id);
  });

  it("returns 400 when a productId does not exist", async () => {
    const res = await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validBundle, productIds: ["00000000-0000-0000-0000-000000000000"] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("product IDs not found");
  });

  it("returns 400 when a productId refers to an isBundle product", async () => {
    const bundleProduct = await prisma.product.create({
      data: makeProduct({
        name: "CB Bundle Row",
        slug: `${SLUG_PREFIX}bundle-row`,
        previewKey: `previews/${SLUG_PREFIX}bundle-row.jpg`,
        assetKey: `assets/${SLUG_PREFIX}bundle-row.zip`,
        isBundle: true,
      }),
    });

    const res = await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validBundle, productIds: [bundleProduct.id] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("product IDs not found");
  });

  it("returns 409 for a duplicate slug", async () => {
    await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validBundle);

    const res = await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validBundle, name: "Different Name" });

    expect(res.status).toBe(409);
  });

  it("returns 409 for a duplicate name", async () => {
    await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validBundle);

    const res = await request(app)
      .post("/api/bundles")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validBundle, slug: `${SLUG_PREFIX}different` });

    expect(res.status).toBe(409);
  });

  it("re-throws unexpected non-P2002 errors", async () => {
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("Unexpected DB error"));

    await expect(
      request(app)
        .post("/api/bundles")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validBundle)
    ).resolves.toMatchObject({ status: 500 });

    vi.restoreAllMocks();
  });
});
