import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const SLUG_PREFIX = "up-test-";
const TAG_PREFIX = "up-tag-";
const ADMIN_EMAIL = "admin@updateproduct.test";
const CUSTOMER_EMAIL = "customer@updateproduct.test";

let adminId: string;
let adminToken: string;
let customerToken: string;

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

describe("PUT /products/:slug", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).put(`/products/${SLUG_PREFIX}any`).send({ price: 9.99 });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer", async () => {
    const res = await request(app)
      .put(`/products/${SLUG_PREFIX}any`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ price: 9.99 });
    expect(res.status).toBe(403);
  });

  it("returns 404 for a non-existent slug", async () => {
    const res = await request(app)
      .put(`/products/${SLUG_PREFIX}nonexistent`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 9.99 });
    expect(res.status).toBe(404);
  });

  it("returns 404 for an inactive product", async () => {
    await prisma.product.create({
      data: { name: "UP Inactive", slug: `${SLUG_PREFIX}inactive`, price: 10, isActive: false, createdBy: adminId },
    });

    const res = await request(app)
      .put(`/products/${SLUG_PREFIX}inactive`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 5 });
    expect(res.status).toBe(404);
  });

  it("returns 200 and updates product fields", async () => {
    await prisma.product.create({
      data: { name: "UP Original", slug: `${SLUG_PREFIX}original`, price: 10, createdBy: adminId },
    });

    const res = await request(app)
      .put(`/products/${SLUG_PREFIX}original`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 49.99, description: "Updated description" });

    expect(res.status).toBe(200);
    expect(res.body.price).toBe(49.99);
    expect(res.body.description).toBe("Updated description");
  });

  it("replaces all tags when tags are provided", async () => {
    const product = await prisma.product.create({
      data: { name: "UP Tagged", slug: `${SLUG_PREFIX}tagged`, price: 10, createdBy: adminId },
    });
    const oldTag = await prisma.tag.create({ data: { name: `${TAG_PREFIX}old`, slug: `${TAG_PREFIX}old` } });
    await prisma.productTag.create({ data: { productId: product.id, tagId: oldTag.id } });

    const res = await request(app)
      .put(`/products/${SLUG_PREFIX}tagged`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ tags: [`${TAG_PREFIX}new`] });

    expect(res.status).toBe(200);
    expect(res.body.tags).toEqual([`${TAG_PREFIX}new`]);
    expect(res.body.tags).not.toContain(`${TAG_PREFIX}old`);
  });

  it("does not change tags when tags field is omitted", async () => {
    const product = await prisma.product.create({
      data: { name: "UP Keep Tags", slug: `${SLUG_PREFIX}keeptags`, price: 10, createdBy: adminId },
    });
    const tag = await prisma.tag.create({ data: { name: `${TAG_PREFIX}keep`, slug: `${TAG_PREFIX}keep` } });
    await prisma.productTag.create({ data: { productId: product.id, tagId: tag.id } });

    const res = await request(app)
      .put(`/products/${SLUG_PREFIX}keeptags`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 15 });

    expect(res.status).toBe(200);
    expect(res.body.tags).toContain(`${TAG_PREFIX}keep`);
  });

  it("creates a product image if none exists", async () => {
    await prisma.product.create({
      data: { name: "UP No Image", slug: `${SLUG_PREFIX}noimage`, price: 10, createdBy: adminId },
    });

    const res = await request(app)
      .put(`/products/${SLUG_PREFIX}noimage`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ previewUrl: "https://cdn.example.com/new.jpg", assetUrl: "https://s3.example.com/new.zip" });

    expect(res.status).toBe(200);
    expect(res.body.previewUrl).toBe("https://cdn.example.com/new.jpg");
  });

  it("updates an existing product image", async () => {
    const product = await prisma.product.create({
      data: { name: "UP Has Image", slug: `${SLUG_PREFIX}hasimage`, price: 10, createdBy: adminId },
    });
    await prisma.productImage.create({
      data: { productId: product.id, previewUrl: "https://cdn.example.com/old.jpg", assetUrl: "https://s3.example.com/old.zip" },
    });

    const res = await request(app)
      .put(`/products/${SLUG_PREFIX}hasimage`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ previewUrl: "https://cdn.example.com/updated.jpg" });

    expect(res.status).toBe(200);
    expect(res.body.previewUrl).toBe("https://cdn.example.com/updated.jpg");
    expect(res.body.assetUrl).toBe("https://s3.example.com/old.zip");
  });

  it("returns 409 when updating to a slug already taken", async () => {
    await prisma.product.create({
      data: { name: "UP Product A", slug: `${SLUG_PREFIX}a`, price: 10, createdBy: adminId },
    });
    await prisma.product.create({
      data: { name: "UP Product B", slug: `${SLUG_PREFIX}b`, price: 10, createdBy: adminId },
    });

    const res = await request(app)
      .put(`/products/${SLUG_PREFIX}a`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ slug: `${SLUG_PREFIX}b` });

    expect(res.status).toBe(409);
  });
});
