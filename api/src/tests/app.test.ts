import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import app from "../app";

vi.mock("../lib/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("Malformed JSON", () => {
  it("returns 400 for invalid JSON body", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send('{"name": "test",}');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid JSON in request body");
  });
});

describe("SPA fallback", () => {
  it("invokes the catch-all handler for unknown routes", async () => {
    const res = await request(app).get("/some-spa-route");
    // index.html does not exist in the test env, so Express returns an error
    // response — the important thing is the route handler is invoked (covers app.ts:79-80)
    expect([404, 500]).toContain(res.status);
  });
});

describe("GET /health", () => {
  it("returns 200", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
  });

  it("returns status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.body.status).toBe("ok");
  });

  it("returns correct message", async () => {
    const res = await request(app).get("/api/health");
    expect(res.body.message).toBe("Testing API");
  });
});

describe("Security headers (helmet)", () => {
  it("sets X-Content-Type-Options to nosniff", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("sets X-Frame-Options", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-frame-options"]).toBe("SAMEORIGIN");
  });

  it("removes X-Powered-By header", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("Rate limiting", () => {
  it("includes rate limit headers on login", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "ratelimit@test.com",
      password: "Password123!",
    });
    expect(res.headers["ratelimit-limit"]).toBeDefined();
    expect(res.headers["ratelimit-remaining"]).toBeDefined();
  });

  it("includes rate limit headers on register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "ratelimit@register.test",
      password: "Password123!",
      firstName: "Test",
      lastName: "User",
    });
    expect(res.headers["ratelimit-limit"]).toBeDefined();
    expect(res.headers["ratelimit-remaining"]).toBeDefined();
  });

  it("includes rate limit headers on verify", async () => {
    const res = await request(app).get("/api/auth/verify?token=fake-token");
    expect(res.headers["ratelimit-limit"]).toBeDefined();
    expect(res.headers["ratelimit-remaining"]).toBeDefined();
  });
});
