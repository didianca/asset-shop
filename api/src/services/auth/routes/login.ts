import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../../../db.js";
import type { LoginBody, JwtPayload } from "../auth.types.js";
import { authConfig } from "../auth.config.js";

const JWT_EXPIRES_IN = "12h";
const DUMMY_HASH = "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012";

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Log in and receive a JWT
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginBody'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       403:
 *         description: Account not yet verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       429:
 *         description: Too many login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function loginHandler(
  req: Request<object, object, LoginBody>,
  res: Response
): Promise<void> {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });

  // Always run bcrypt.compare even when user doesn't exist — prevents timing side-channel
  // that leaks whether an email is registered (bcrypt is ~250ms, skipping it is obvious)
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const passwordMatch = await bcrypt.compare(password, hash);

  if (!user || !passwordMatch) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  if (user.status === "pending") {
    res.status(403).json({ message: "Please verify your email before logging in" });
    return;
  }

  if (user.status === "deleted") {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }

  const payload: JwtPayload = {
    id: user.id,
    role: user.role,
    status: user.status,
  };

  const token = jwt.sign(payload, authConfig.jwtSecret, { expiresIn: JWT_EXPIRES_IN });

  res.status(200).json({ token });
}
