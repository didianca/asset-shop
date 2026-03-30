import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/index.js";
import prisma from "../../../db.js";
import type { CreateProductBody } from "../product.types.js";
import { formatProduct, resolveKeysFromSlug, toTagSlug } from "../utils.js";

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Create a new product
 *     description: |
 *       Admin only. Creates a new product with optional tags.
 *       The preview and asset S3 keys are inferred from the slug — upload the asset via POST /upload before creating the product.
 *     tags:
 *       - Products
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateProductBody'
 *     responses:
 *       201:
 *         description: Product created
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
 *       400:
 *         description: Validation error or no uploaded assets found for the given slug
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
export async function createProductHandler(
  req: Request<object, object, CreateProductBody>,
  res: Response
): Promise<void> {
  const { name, slug, description, price, discountPercent, tags } = req.body;
  const createdBy = req.user!.id;

  const keys = await resolveKeysFromSlug(slug);
  if (!keys) {
    res.status(400).json({ message: "No uploaded assets found for this slug. Upload the asset via POST /upload first." });
    return;
  }
  const { previewKey, assetKey } = keys;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          name, slug, description: description ?? null, price,
          discountPercent: discountPercent ?? null, previewKey, assetKey, createdBy,
        },
      });

      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          const tag = await tx.tag.upsert({
            where: { slug: toTagSlug(tagName) },
            update: {},
            create: { name: tagName, slug: toTagSlug(tagName) },
          });
          await tx.productTag.create({ data: { productId: created.id, tagId: tag.id } });
        }
      }

      return tx.product.findUnique({
        where: { id: created.id },
        include: { tags: { include: { tag: true } } },
      });
    });

    res.status(201).json(formatProduct(product!));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ message: "A product with those details already exists" });
      return;
    }
    throw e;
  }
}
