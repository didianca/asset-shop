import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { formatBundle } from "../utils.js";

/**
 * @openapi
 * /bundles:
 *   get:
 *     summary: List all active bundles
 *     tags:
 *       - Bundles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bundles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BundleResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function listBundlesHandler(
  _req: Request,
  res: Response
): Promise<void> {
  const bundles = await prisma.bundle.findMany({
    where: { isActive: true },
    include: { products: { where: { isBundle: false } } },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json(bundles.map(formatBundle));
}
