import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { formatProduct } from "../utils.js";

/**
 * @openapi
 * /products/{slug}:
 *   get:
 *     summary: Get a product by slug
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
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
  req: Request<{ slug: string }>,
  res: Response
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { slug: req.params.slug },
    include: { image: true, tags: { include: { tag: true } } },
  });

  if (!product || !product.isActive) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  res.status(200).json(formatProduct(product));
}
