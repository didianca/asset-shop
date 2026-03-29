import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/index.js";
import prisma from "../../../db.js";
import type { UpdateProductBody } from "../product.types.js";
import { formatProduct, resolveKeysFromSlug, toTagSlug } from "../utils.js";

/**
 * @openapi
 * /products/{id}:
 *   put:
 *     summary: Update a product
 *     description: |
 *       Admin only. If the slug changes, the preview and asset S3 keys are re-resolved from S3 — upload the asset via POST /upload with the new slug first.
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
 *       400:
 *         description: Validation error or no uploaded assets found for the new slug
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       409:
 *         description: Product with those details already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function updateProductHandler(
  req: Request<{ id: string }, object, UpdateProductBody>,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const { name, slug: newSlug, description, price, discountPercent, isActive, tags } = req.body;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || !existing.isActive) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  let previewKey = existing.previewKey;
  let assetKey = existing.assetKey;

  if (newSlug !== existing.slug) {
    const keys = await resolveKeysFromSlug(newSlug);
    if (!keys) {
      res.status(400).json({ message: "No uploaded assets found for this slug. Upload the asset via POST /upload first." });
      return;
    }
    previewKey = keys.previewKey;
    assetKey = keys.assetKey;
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { name, slug: newSlug, description, price, discountPercent, isActive, previewKey, assetKey },
      });

      await tx.productTag.deleteMany({ where: { productId: existing.id } });
      for (const tagName of tags) {
        const tag = await tx.tag.upsert({
          where: { slug: toTagSlug(tagName) },
          update: {},
          create: { name: tagName, slug: toTagSlug(tagName) },
        });
        await tx.productTag.create({ data: { productId: existing.id, tagId: tag.id } });
      }

      return tx.product.findUnique({
        where: { id: existing.id },
        include: { tags: { include: { tag: true } }, bundle: true },
      });
    });

    res.status(200).json(formatProduct(product!));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ message: "A product with those details already exists" });
      return;
    }
    throw e;
  }
}
