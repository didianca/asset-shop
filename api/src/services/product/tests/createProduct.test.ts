import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

vi.mock("../utils.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils.js")>();
  return {
    ...actual,
    resolveKeysFromSlug: vi.fn().mockResolvedValue({ previewKey: "previews/cp-preview.jpg", assetKey: "assets/cp-asset.zip" }),
  };
});

const SLUG_PREFIX = "cp-test-";
const TAG_PREFIX = "cp-tag-";
const ADMIN_EMAIL = "admin@createproduct.test";
const CUSTOMER_EMAIL = "customer@createproduct.test";

let adminId: string;
let adminToken: string;
let customerToken: string;

const validProduct = {
  name: "CP Test Product",
  slug: `${SLUG_PREFIX}product`,
  price: 19.99,
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

describe("POST /products", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).post("/api/products").send(validProduct);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${customerToken}`)
      .send(validProduct);
    expect(res.status).toBe(403);
  });

  it("returns 400 for missing required fields", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Missing price and slug" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for negative price", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validProduct, price: -5 });
    expect(res.status).toBe(400);
  });

  it("returns 400 for discountPercent out of range", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validProduct, discountPercent: 101 });
    expect(res.status).toBe(400);
  });

  it("returns 400 for discountPercent of 0", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validProduct, discountPercent: 0 });
    expect(res.status).toBe(400);
  });

  it("returns 201 and the created product", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validProduct);

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe(validProduct.slug);
    expect(res.body.name).toBe(validProduct.name);
    expect(res.body.price).toBe(validProduct.price);
    expect(res.body.isActive).toBe(true);
    expect(res.body.tags).toEqual([]);
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();
  });

  it("creates the product in the database", async () => {
    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validProduct);

    const product = await prisma.product.findUnique({ where: { slug: validProduct.slug } });
    expect(product).not.toBeNull();
    expect(product?.isActive).toBe(true);
  });

  it("creates tags and links them to the product", async () => {
    const tags = [`${TAG_PREFIX}dark`, `${TAG_PREFIX}minimal`];
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validProduct, tags });

    expect(res.status).toBe(201);
    expect(res.body.tags).toEqual(expect.arrayContaining(tags));

    const product = await prisma.product.findUnique({
      where: { slug: validProduct.slug },
      include: { tags: { include: { tag: true } } },
    });
    expect(product?.tags).toHaveLength(2);
  });

  it("reuses an existing tag instead of creating a duplicate", async () => {
    const tagName = `${TAG_PREFIX}reuse`;
    const tagSlug = tagName;

    await prisma.tag.create({ data: { name: tagName, slug: tagSlug } });

    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validProduct, tags: [tagName] });

    const count = await prisma.tag.count({ where: { slug: tagSlug } });
    expect(count).toBe(1);
  });

  it("returns keys and computed URLs in the response", async () => {
    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validProduct);

    expect(res.status).toBe(201);
    expect(res.body.previewKey).toBe("previews/cp-preview.jpg");
    expect(res.body.assetKey).toBe("assets/cp-asset.zip");
    expect(res.body.previewUrl).toContain("previews/cp-preview.jpg");
    expect(res.body.assetUrl).toContain("assets/cp-asset.zip");
  });

  it("returns 400 when no assets are uploaded for the slug", async () => {
    const { resolveKeysFromSlug } = await import("../utils.js");
    (resolveKeysFromSlug as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validProduct, name: "CP No Upload", slug: `${SLUG_PREFIX}no-upload` });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain("No uploaded assets found");
  });

  it("returns 409 for a duplicate slug", async () => {
    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validProduct);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validProduct, name: "Different Name" });

    expect(res.status).toBe(409);
  });

  it("returns 409 for a duplicate name", async () => {
    await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validProduct);

    const res = await request(app)
      .post("/api/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ ...validProduct, slug: `${SLUG_PREFIX}different-slug` });

    expect(res.status).toBe(409);
  });

  it("re-throws unexpected non-P2002 errors", async () => {
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(new Error("Unexpected DB error"));

    await expect(
      request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(validProduct)
    ).resolves.toMatchObject({ status: 500 });

    vi.restoreAllMocks();
  });

});
