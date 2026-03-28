import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/index.js";
import prisma from "../../../db.js";
import type { CreateProductBody } from "../product.types.js";
import { formatProduct, toTagSlug } from "../utils.js";

/**
 * @openapi
 * /products:
 *   post:
 *     summary: Create a new product
 *     description: Admin only. Creates a new product with optional tags and image URLs.
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
 *       409:
 *         description: Name or slug already taken
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function createProductHandler(
  req: Request<object, object, CreateProductBody>,
  res: Response
): Promise<void> {
  const { name, slug, description, price, discountPercent, tags, previewUrl, assetUrl } = req.body;
  const createdBy = req.user!.id;

  try {
    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: { name, slug, description: description ?? null, price, discountPercent: discountPercent ?? null, createdBy },
      });

      if (previewUrl && assetUrl) {
        await tx.productImage.create({
          data: { productId: created.id, previewUrl, assetUrl },
        });
      }

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
        include: { image: true, tags: { include: { tag: true } } },
      });
    });

    res.status(201).json(formatProduct(product!));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ message: "A product with that name or slug already exists" });
      return;
    }
    throw e;
  }
}
