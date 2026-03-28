import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/index.js";
import prisma from "../../../db.js";
import type { UpdateProductBody } from "../product.types.js";
import { formatProduct, toTagSlug } from "../utils.js";

/**
 * @openapi
 * /products/{slug}:
 *   put:
 *     summary: Update a product
 *     description: Admin only.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateProductBody'
 *     responses:
 *       200:
 *         description: Product updated
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
 *       409:
 *         description: Name or slug already taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function updateProductHandler(
  req: Request<{ slug: string }, object, UpdateProductBody>,
  res: Response
): Promise<void> {
  const { slug } = req.params;
  const { name, slug: newSlug, description, price, discountPercent, tags, previewUrl, assetUrl } = req.body;

  const existing = await prisma.product.findUnique({ where: { slug } });
  if (!existing || !existing.isActive) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { slug },
        data: {
          ...(name !== undefined && { name }),
          ...(newSlug !== undefined && { slug: newSlug }),
          ...(description !== undefined && { description: description ?? null }),
          ...(price !== undefined && { price }),
          ...(discountPercent !== undefined && { discountPercent: discountPercent ?? null }),
          ...(previewUrl !== undefined && { previewUrl }),
          ...(assetUrl !== undefined && { assetUrl }),
        },
      });

      if (tags !== undefined) {
        await tx.productTag.deleteMany({ where: { productId: existing.id } });
        for (const tagName of tags) {
          const tag = await tx.tag.upsert({
            where: { slug: toTagSlug(tagName) },
            update: {},
            create: { name: tagName, slug: toTagSlug(tagName) },
          });
          await tx.productTag.create({ data: { productId: existing.id, tagId: tag.id } });
        }
      }

      return tx.product.findUnique({
        where: { id: existing.id },
        include: { tags: { include: { tag: true } } },
      });
    });

    res.status(200).json(formatProduct(product!));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ message: "A product with that name or slug already exists" });
      return;
    }
    throw e;
  }
}
