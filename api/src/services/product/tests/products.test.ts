import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../app.js";
import { authConfig } from "../../auth/auth.config.js";
import type { JwtPayload } from "../../auth/auth.types.js";

function token(overrides: Partial<JwtPayload> = {}): string {
  const payload: JwtPayload = { id: "uuid", role: "customer", status: "active", ...overrides };
  return jwt.sign(payload, authConfig.jwtSecret, { expiresIn: "1h" });
}

const customerToken = token();
const adminToken = token({ role: "admin" });

const validProduct = {
  name: "Dark Minimalist Pack",
  slug: "dark-minimalist-pack",
  price: 19.99,
};

describe("GET /products", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/products");
    expect(res.status).toBe(401);
  });

  it("returns 200 for an authenticated user", async () => {
    const res = await request(app)
      .get("/products")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });
});

describe("GET /products/:slug", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/products/some-slug");
    expect(res.status).toBe(401);
  });

  it("returns 200 for an authenticated user", async () => {
    const res = await request(app)
      .get("/products/some-slug")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
  });
});

describe("POST /products", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).post("/products").send(validProduct);
    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${customerToken}`)
      .send(validProduct);
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid body", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Missing price and slug" });
    expect(res.status).toBe(400);
  });

  it("returns 201 for an admin with valid body", async () => {
    const res = await request(app)
      .post("/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(validProduct);
    expect(res.status).toBe(201);
  });
});

describe("PUT /products/:slug", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).put("/products/some-slug").send({ price: 9.99 });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer", async () => {
    const res = await request(app)
      .put("/products/some-slug")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ price: 9.99 });
    expect(res.status).toBe(403);
  });

  it("returns 200 for an admin", async () => {
    const res = await request(app)
      .put("/products/some-slug")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ price: 9.99 });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /products/:slug", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).delete("/products/some-slug");
    expect(res.status).toBe(401);
  });

  it("returns 403 for a customer", async () => {
    const res = await request(app)
      .delete("/products/some-slug")
      .set("Authorization", `Bearer ${customerToken}`);
    expect(res.status).toBe(403);
  });

  it("returns 200 for an admin", async () => {
    const res = await request(app)
      .delete("/products/some-slug")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });
});
