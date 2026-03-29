import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app";

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
