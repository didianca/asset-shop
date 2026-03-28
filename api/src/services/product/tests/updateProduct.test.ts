import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "up-test-";
const TAG_PREFIX = "up-tag-";
const ADMIN_EMAIL = "admin@updateproduct.test";
const CUSTOMER_EMAIL = "customer@updateproduct.test";

const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

let adminId: string;
let adminToken: string;
let customerToken: string;

const makeProduct = <T extends object>(overrides: T): { price: number; previewUrl: string; assetUrl: string; createdBy: string } & T => ({
  price: 10,
  previewUrl: "https://cdn.example.com/up-preview.jpg",
  assetUrl: "https://s3.example.com/up-asset.zip",
  createdBy: adminId,
  ...overrides,
});

const validUpdate = {
  name: "UP Updated Name",
  slug: `${SLUG_PREFIX}updated`,
  description: null,
  price: 20,
  discountPercent: null,
  isActive: true,
  tags: [],
  previewUrl: "https://cdn.example.com/up-updated-preview.jpg",
  assetUrl: "https://s3.example.com/up-updated-asset.zip",
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
  await prisma.tag.deleteMany({ where: { slug: { startsWith: TAG_PREFIX } } });
});

afterAll(async () => {
  await prisma.product.deleteMany({ where: { slug: { startsWith: SLUG_PREFIX } } });
  await prisma.tag.deleteMany({ where: { slug: { startsWith: TAG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: { in: [ADMIN_EMAIL, CUSTOMER_EMAIL] } } });
  await prisma.$disconnect();
});

describe("PUT /products/:id", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).put(`/products/${NONEXISTENT_ID}`).send(validUpdate);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer", async () => {
    const res = await request(app)
      .put(`/products/${NONEXISTENT_ID}`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send(validUpdate);
    expect(res.status).toBe(403);
  });

  it("returns 400 for a missing required field", async () => {
    const { price: _price, ...withoutPrice } = validUpdate; // eslint-disable-line @typescript-eslint/no-unused-vars
    const res = await request(app)
      .put(`/products/${NONEXISTENT_ID}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(withoutPrice);
    expect(res.status).toBe(400);
  });

  it("returns 404 for a non-existent id", async () => {
    const res = await request(app)
      .put(`/products/${NONEXISTENT_ID}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validUpdate);
    expect(res.status).toBe(404);
  });

  it("returns 404 for an inactive product", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UP Inactive", slug: `${SLUG_PREFIX}inactive`, isActive: false }),
    });

    const res = await request(app)
      .put(`/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validUpdate);
    expect(res.status).toBe(404);
  });

  it("returns 200 and updates all product fields", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UP Original", slug: `${SLUG_PREFIX}original` }),
    });

    const res = await request(app)
      .put(`/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validUpdate, name: "UP Renamed", slug: `${SLUG_PREFIX}renamed`, price: 49.99, description: "Updated description", discountPercent: 10 });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("UP Renamed");
    expect(res.body.price).toBe(49.99);
    expect(res.body.description).toBe("Updated description");
    expect(res.body.discountPercent).toBe(10);
  });

  it("sets isActive to false when isActive is false", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UP Deactivate", slug: `${SLUG_PREFIX}deactivate` }),
    });

    const res = await request(app)
      .put(`/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validUpdate, isActive: false });

    expect(res.status).toBe(200);
    expect(res.body.isActive).toBe(false);
  });

  it("replaces tags with provided tags", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UP Tagged", slug: `${SLUG_PREFIX}tagged` }),
    });
    const oldTag = await prisma.tag.create({ data: { name: `${TAG_PREFIX}old`, slug: `${TAG_PREFIX}old` } });
    await prisma.productTag.create({ data: { productId: product.id, tagId: oldTag.id } });

    const res = await request(app)
      .put(`/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validUpdate, tags: [`${TAG_PREFIX}new`] });

    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual([`${TAG_PREFIX}new`]);
    expect(res.body.tags).not.toContain(`${TAG_PREFIX}old`);
  });

  it("clears tags when an empty tags array is provided", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UP Clear Tags", slug: `${SLUG_PREFIX}cleartags` }),
    });
    const tag = await prisma.tag.create({ data: { name: `${TAG_PREFIX}clear`, slug: `${TAG_PREFIX}clear` } });
    await prisma.productTag.create({ data: { productId: product.id, tagId: tag.id } });

    const res = await request(app)
      .put(`/products/${product.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validUpdate, tags: [] });

    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual([]);
  });

  it("returns 409 when updating to a slug already taken", async () => {
    const productA = await prisma.product.create({
      data: makeProduct({ name: "UP Product A", slug: `${SLUG_PREFIX}a`, previewUrl: "https://cdn.example.com/up-a.jpg", assetUrl: "https://s3.example.com/up-a.zip" }),
    });
    await prisma.product.create({
      data: makeProduct({ name: "UP Product B", slug: `${SLUG_PREFIX}b`, previewUrl: "https://cdn.example.com/up-b.jpg", assetUrl: "https://s3.example.com/up-b.zip" }),
    });

    const res = await request(app)
      .put(`/products/${productA.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validUpdate, slug: `${SLUG_PREFIX}b` });

    expect(res.status).toBe(409);
  });

  it("re-throws unexpected non-P2002 errors", async () => {
    const product = await prisma.product.create({
      data: makeProduct({ name: "UP Error Test", slug: `${SLUG_PREFIX}error` }),
    });

    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("Unexpected DB error"));

    await expect(
      request(app)
        .put(`/products/${product.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validUpdate)
    ).resolves.toMatchObject({ status: 500 });

    vi.restoreAllMocks();
  });
});
