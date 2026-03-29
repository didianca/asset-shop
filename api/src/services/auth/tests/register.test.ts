import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import request from "supertest";
import app from "../../../app.js";
import prisma from "../../../db.js";

vi.mock("../../../lib/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

const TEST_EMAIL_DOMAIN = "@register.test";

beforeEach(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.$disconnect();
});

describe("POST /auth/register", () => {
  it("returns 201 on successful registration", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: `user${TEST_EMAIL_DOMAIN}`,
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBeDefined();
  });

  it("creates user with status pending", async () => {
    await request(app).post("/api/auth/register").send({
      email: `pending${TEST_EMAIL_DOMAIN}`,
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
    });

    const user = await prisma.user.findUnique({ where: { email: `pending${TEST_EMAIL_DOMAIN}` } });
    expect(user?.status).toBe("pending");
  });

  it("returns 400 for invalid request body", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "not-an-email",
      password: "short",
      firstName: "",
      lastName: "User",
    });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("returns 409 when email belongs to an active user", async () => {
    await prisma.user.create({
      data: {
        email: `active${TEST_EMAIL_DOMAIN}`,
        passwordHash: "irrelevant",
        firstName: "Test",
        lastName: "User",
        status: "active",
      },
    });

    const res = await request(app).post("/api/auth/register").send({
      email: `active${TEST_EMAIL_DOMAIN}`,
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
    });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe("Email is already registered");
  });

  it("returns 201 and resends verification for a pending user", async () => {
    const body = {
      email: `resend${TEST_EMAIL_DOMAIN}`,
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
    };

    await request(app).post("/api/auth/register").send(body);
    const res = await request(app).post("/api/auth/register").send(body);

    expect(res.status).toBe(201);
  });

  it("generates a new verification token when resending for a pending user", async () => {
    const body = {
      email: `newtoken${TEST_EMAIL_DOMAIN}`,
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
    };

    await request(app).post("/api/auth/register").send(body);
    const before = await prisma.user.findUnique({ where: { email: body.email } });

    await request(app).post("/api/auth/register").send(body);
    const after = await prisma.user.findUnique({ where: { email: body.email } });

    expect(after?.verificationToken).not.toBe(before?.verificationToken);
  });
});
