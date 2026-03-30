import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { formatBundle } from "../utils.js";

/**
 * @openapi
 * /bundles/{id}:
 *   get:
 *     summary: Get a bundle by ID
 *     tags:
 *       - Bundles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Bundle found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BundleResponse'
 *       400:
 *         description: Invalid bundle ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       404:
 *         description: Bundle not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function getBundleHandler(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const bundle = await prisma.bundle.findUnique({
    where: { id: req.params.id },
    include: { products: { where: { isBundle: false } } },
  });

  if (!bundle || !bundle.isActive) {
    res.status(404).json({ message: "Bundle not found" });
    return;
  }

  res.status(200).json(formatBundle(bundle));
}
