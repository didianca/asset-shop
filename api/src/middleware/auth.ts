import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "../services/auth/auth.types.js";
import { authConfig } from "../services/auth/auth.config.js";

// Extend Express Request to carry the decoded JWT payload
declare module "express-serve-static-core" {
  interface Request {
    user?: JwtPayload;
  }
}

// Verifies the JWT on every protected route.
// Rejects requests from unauthenticated, pending, or deleted users.
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ message: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, authConfig.jwtSecret) as JwtPayload;

    // Reject pending or deleted users even if they somehow have a token
    if (payload.status !== "active") {
      res.status(403).json({ message: "Account is not active" });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

// Middleware to restrict a route to admin users only.
// Must be used after authenticate.
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.user?.role !== "admin") {
    res.status(403).json({ message: "Admin access required" });
    return;
  }
  next();
}
