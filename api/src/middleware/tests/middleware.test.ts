import {describe, expect, it, vi} from "vitest";
import type {NextFunction, Request, Response} from "express";
import jwt from "jsonwebtoken";
import {authenticate, requireAdmin} from "../auth.js";
import {authConfig} from "../../services/auth/auth.config.js";
import type {JwtPayload} from "../../services/auth/auth.types.js";

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function validToken(overrides: Partial<JwtPayload> = {}): string {
  const payload: JwtPayload = { id: "uuid", role: "customer", status: "active", ...overrides };
  return jwt.sign(payload, authConfig.jwtSecret, { expiresIn: "1h" });
}

describe("authenticate", () => {
  it("returns 401 when Authorization header is missing", () => {
    const req = { headers: {} } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when header does not start with Bearer", () => {
    const req = { headers: { authorization: "Basic abc" } } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when Bearer token is empty", () => {
    const req = { headers: { authorization: "Bearer " } } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid token", () => {
    const req = { headers: { authorization: "Bearer invalid.token.here" } } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 for a pending user", () => {
    const token = validToken({ status: "pending" });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 for a deleted user", () => {
    const token = validToken({ status: "deleted" });
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next and sets req.user for a valid active token", () => {
    const token = validToken();
    const req = { headers: { authorization: `Bearer ${token}` } } as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect((req as Request & { user: JwtPayload }).user.status).toBe("active");
  });
});

describe("requireAdmin", () => {
  it("returns 403 for a customer", () => {
    const req = { user: { role: "customer" } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next for an admin", () => {
    const req = { user: { role: "admin" } } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as NextFunction;

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
