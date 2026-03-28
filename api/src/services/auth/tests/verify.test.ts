import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import crypto from "crypto";
import app from "../../../app.js";
import prisma from "../../../db.js";

const TEST_EMAIL_DOMAIN = "@verify.test";

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.$disconnect();
});

async function createPendingUser(email: string, tokenExpiresHoursFromNow = 24): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + tokenExpiresHoursFromNow * 60 * 60 * 1000);

  await prisma.user.create({
    data: {
      email,
      passwordHash: "irrelevant",
      firstName: "Test",
      lastName: "User",
      status: "pending",
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt,
    },
  });

  return token;
}

describe("GET /auth/verify", () => {
  it("returns 400 when token is missing", async () => {
    const res = await request(app).get("/auth/verify");
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid token", async () => {
    const res = await request(app).get("/auth/verify?token=invalid-token");
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid verification token");
  });

  it("returns 400 for expired token", async () => {
    const token = await createPendingUser(`expired${TEST_EMAIL_DOMAIN}`, -1);
    const res = await request(app).get(`/auth/verify?token=${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it("returns 400 when user is already active", async () => {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.user.create({
      data: {
        email: `active${TEST_EMAIL_DOMAIN}`,
        passwordHash: "irrelevant",
        firstName: "Test",
        lastName: "User",
        status: "active",
        verificationToken: token,
        verificationTokenExpiresAt: new Date(Date.now() + 86400000),
      },
    });

    const res = await request(app).get(`/auth/verify?token=${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Email is already verified");
  });

  it("returns 200 and activates user with valid token", async () => {
    const token = await createPendingUser(`new${TEST_EMAIL_DOMAIN}`);

    const res = await request(app).get(`/auth/verify?token=${token}`);
    expect(res.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { email: `new${TEST_EMAIL_DOMAIN}` } });
    expect(user?.status).toBe("active");
    expect(user?.verificationToken).toBeNull();
  });
});
