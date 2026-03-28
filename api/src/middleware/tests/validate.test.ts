import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validate } from "../validate.js";

const TestSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

function mockReq(body: unknown): Request {
  return { body } as Request;
}

function mockRes(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe("validate middleware", () => {
  it("calls next and sets req.body to parsed data for a valid body", () => {
    const req = mockReq({ email: "user@example.com", name: "Alice" });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    validate(TestSchema)(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ email: "user@example.com", name: "Alice" });
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 400 with field errors for an invalid body", () => {
    const req = mockReq({ email: "not-an-email", name: "" });
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    validate(TestSchema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid request",
        errors: expect.objectContaining({
          email: expect.any(Array),
          name: expect.any(Array),
        }),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", () => {
    const req = mockReq({});
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    validate(TestSchema)(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });
});
