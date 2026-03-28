import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import prisma from "../../../db.js";
import { authConfig } from "../../auth/auth.config.js";

const TAG_PREFIX = "gt-tag-";
const ADMIN_EMAIL = "admin@gettags.test";

let adminToken: string;

beforeAll(async () => {
  await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });

  const admin = await prisma.user.create({
    data: { email: ADMIN_EMAIL, passwordHash: "x", firstName: "Admin", lastName: "Test", role: "admin", status: "active" },
  });
  adminToken = jwt.sign({ id: admin.id, role: "admin", status: "active" }, authConfig.jwtSecret, { expiresIn: "1h" });
});

beforeEach(async () => {
  await prisma.tag.deleteMany({ where: { slug: { startsWith: TAG_PREFIX } } });
});

afterAll(async () => {
  await prisma.tag.deleteMany({ where: { slug: { startsWith: TAG_PREFIX } } });
  await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });
  await prisma.$disconnect();
});

describe("GET /products/tags", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/products/tags");
    expect(res.status).toBe(401);
  });

  it("returns 200 with an empty array when no tags exist", async () => {
    const res = await request(app)
      .get("/products/tags")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns tag names as strings", async () => {
    await prisma.tag.createMany({
      data: [
        { name: `${TAG_PREFIX}dark`, slug: `${TAG_PREFIX}dark` },
        { name: `${TAG_PREFIX}minimal`, slug: `${TAG_PREFIX}minimal` },
      ],
    });

    const res = await request(app)
      .get("/products/tags")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toContain(`${TAG_PREFIX}dark`);
    expect(res.body).toContain(`${TAG_PREFIX}minimal`);
  });

  it("returns tags sorted alphabetically", async () => {
    await prisma.tag.createMany({
      data: [
        { name: `${TAG_PREFIX}zebra`, slug: `${TAG_PREFIX}zebra` },
        { name: `${TAG_PREFIX}alpha`, slug: `${TAG_PREFIX}alpha` },
        { name: `${TAG_PREFIX}middle`, slug: `${TAG_PREFIX}middle` },
      ],
    });

    const res = await request(app)
      .get("/products/tags")
      .set("Authorization", `Bearer ${adminToken}`);

    const testTags = (res.body as string[]).filter((t) => t.startsWith(TAG_PREFIX));
    expect(testTags).toEqual([`${TAG_PREFIX}alpha`, `${TAG_PREFIX}middle`, `${TAG_PREFIX}zebra`]);
  });
});
