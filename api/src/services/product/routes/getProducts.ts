import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { formatProduct } from "../utils.js";

/**
 * @openapi
 * /products:
 *   get:
 *     summary: List all active products
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
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
  _req: Request,
  res: Response
): Promise<void> {
  const products = await prisma.product.findMany({
    where: { isActive: true, isBundle: false },
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: "desc" },
  });

  res.status(200).json(products.map(formatProduct));
}
