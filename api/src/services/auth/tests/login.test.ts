import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import app from "../../../app.js";
import prisma from "../../../db.js";

const TEST_EMAIL_DOMAIN = "@login.test";
const PASSWORD = "Password123!";
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 10);

  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });

  await prisma.user.createMany({
    data: [
      {
        email: `active${TEST_EMAIL_DOMAIN}`,
        passwordHash,
        firstName: "Active",
        lastName: "User",
        status: "active",
      },
      {
        email: `pending${TEST_EMAIL_DOMAIN}`,
        passwordHash,
        firstName: "Pending",
        lastName: "User",
        status: "pending",
      },
      {
        email: `deleted${TEST_EMAIL_DOMAIN}`,
        passwordHash,
        firstName: "Deleted",
        lastName: "User",
        status: "deleted",
      },
    ],
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } });
  await prisma.$disconnect();
});

describe("POST /auth/login", () => {
  it("returns 200 with token for active user", async () => {
    const res = await request(app).post("/auth/login").send({
      email: `active${TEST_EMAIL_DOMAIN}`,
      password: PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("returns 401 for wrong password", async () => {
    const res = await request(app).post("/auth/login").send({
      email: `active${TEST_EMAIL_DOMAIN}`,
      password: "WrongPassword!",
    });

    expect(res.status).toBe(401);
  });

  it("returns 401 for non-existent email", async () => {
    const res = await request(app).post("/auth/login").send({
      email: `nobody${TEST_EMAIL_DOMAIN}`,
      password: PASSWORD,
    });

    expect(res.status).toBe(401);
  });

  it("returns 403 for pending user", async () => {
    const res = await request(app).post("/auth/login").send({
      email: `pending${TEST_EMAIL_DOMAIN}`,
      password: PASSWORD,
    });

    expect(res.status).toBe(403);
  });

  it("returns 401 for deleted user", async () => {
    const res = await request(app).post("/auth/login").send({
      email: `deleted${TEST_EMAIL_DOMAIN}`,
      password: PASSWORD,
    });

    expect(res.status).toBe(401);
  });
});
