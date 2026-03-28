import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "../../../db.js";
import { sendVerificationEmail } from "../../../lib/email.js";
import type { RegisterBody } from "../auth.types.js";

const SALT_ROUNDS = 10; 
const VERIFICATION_TOKEN_EXPIRES_HOURS = 12;

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterBody'
 *     responses:
 *       201:
 *         description: Registration successful — verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function registerHandler(
  req: Request<object, object, RegisterBody>,
  res: Response
): Promise<void> {
  const { email, password, firstName, lastName } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: "Email is already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Generate a secure random token for email verification
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpiresAt = new Date(
    Date.now() + VERIFICATION_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000
  );

  // Create user with status = pending until email is verified
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName,
      lastName,
      verificationToken,
      verificationTokenExpiresAt,
    },
  });

  await sendVerificationEmail(email, verificationToken);

  res.status(201).json({ message: "Registration successful. Please check your email to verify your account." });
}
