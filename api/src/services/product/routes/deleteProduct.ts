import type { Request, Response } from "express";
import prisma from "../../../db.js";

/**
 * @openapi
 * /products/{slug}:
 *   delete:
 *     summary: Delete a product
 *     description: Admin only. Soft deletes by setting isActive to false.
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
 *         description: Product deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       403:
 *         description: Admin access required
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
export async function deleteProductHandler(
  req: Request<{ slug: string }>,
  res: Response
): Promise<void> {
  const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });

  if (!product || !product.isActive) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  await prisma.product.update({ where: { id: product.id }, data: { isActive: false } });

  res.status(200).json({ message: "Product deleted" });
}
