import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { formatProduct } from "../utils.js";

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     summary: Get a product by ID
 *     tags:
 *       - Products
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
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       400:
 *         description: Invalid product ID
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
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function getProductHandler(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    include: { tags: { include: { tag: true } } },
  });

  if (!product || !product.isActive) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  res.status(200).json(formatProduct(product));
}
