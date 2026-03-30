import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { MessageRejected } from "@aws-sdk/client-ses";
import prisma from "../../../db.js";
import { sendVerificationEmail } from "../../../lib/email.js";
import type { RegisterBody } from "../auth.types.js";

const SALT_ROUNDS = 10; 
const VERIFICATION_TOKEN_EXPIRES_HOURS = 24;

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
 *         description: Registration successful — verification email sent (resent if account was pending)
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
 *       429:
 *         description: Too many registration attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       503:
 *         description: Email address not verified in SES — recipient must be added to verified identities
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
  if (existing && existing.status !== "pending") {
    res.status(409).json({ message: "Email is already registered" });
    return;
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpiresAt = new Date(
    Date.now() + VERIFICATION_TOKEN_EXPIRES_HOURS * 60 * 60 * 1000
  );

  if (existing && existing.status === "pending") {
    await prisma.user.update({
      where: { email },
      data: { verificationToken, verificationTokenExpiresAt },
    });
  } else {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

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
  }

  try {
    await sendVerificationEmail(email, verificationToken);
  } catch (err) {
    if (err instanceof MessageRejected) {
      res.status(503).json({
        message:
          "This email address is not verified with our email provider. " +
          "Please contact support or use an email that has been added to the verified identities list.",
      });
      return;
    }
    throw err;
  }

  res.status(201).json({ message: "Registration successful. Please check your email to verify your account." });
}
