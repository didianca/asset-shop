import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { formatProduct } from "../utils.js";

/**
 * @openapi
 * /products:
 *   get:
 *     summary: List products
 *     description: >
 *       Returns active products by default. Admins can pass
 *       `includeInactive=true` to include inactive products.
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: string
 *           enum: ["true"]
 *         description: Include inactive products (admin only)
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProductResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function listProductsHandler(
  req: Request,
  res: Response
): Promise<void> {
  const isAdmin = req.user?.role === "admin";
  const includeInactive = req.query.includeInactive === "true";

  const products = await prisma.product.findMany({
    where: isAdmin && includeInactive ? {} : { isActive: true },
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json(products.map(formatProduct));
}
