import type { Request, Response } from "express";
import prisma from "../../../db.js";

/**
 * @openapi
 * /auth/verify:
 *   get:
 *     summary: Verify email address using token from verification email
 *     tags:
 *       - Auth
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification token from the email link
 *     responses:
 *       200:
 *         description: Email verified — account is now active
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Missing, invalid, or expired token — or account already verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function verifyEmailHandler(
  req: Request<object, object, object, { token: string }>,
  res: Response
): Promise<void> {
  const { token } = req.query;

  if (!token) {
    res.status(400).json({ message: "Verification token is required" });
    return;
  }

  const user = await prisma.user.findFirst({
    where: { verificationToken: token },
  });

  if (!user) {
    res.status(400).json({ message: "Invalid verification token" });
    return;
  }

  if (
    !user.verificationTokenExpiresAt ||
    user.verificationTokenExpiresAt < new Date()
  ) {
    res.status(400).json({ message: "Verification token has expired. Please register again." });
    return;
  }

  if (user.status === "active") {
    res.status(400).json({ message: "Email is already verified" });
    return;
  }

  // Activate the user and clear the verification token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      status: "active",
      verificationToken: null,
      verificationTokenExpiresAt: null,
    },
  });

  res.status(200).json({ message: "Email verified successfully. You can now log in." });
}
