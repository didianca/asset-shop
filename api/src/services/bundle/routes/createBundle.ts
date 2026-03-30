import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/index.js";
import prisma from "../../../db.js";
import type { CreateBundleBody } from "../bundle.types.js";
import { formatBundle } from "../utils.js";

/**
 * @openapi
 * /bundles:
 *   post:
 *     summary: Create a new bundle
 *     description: Admin only. Creates a new bundle and optionally assigns existing products to it.
 *     tags:
 *       - Bundles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBundleBody'
 *     responses:
 *       201:
 *         description: Bundle created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BundleResponse'
 *       400:
 *         description: Validation error or one or more product IDs not found
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
 *       403:
 *         description: Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       409:
 *         description: Bundle with those details already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function createBundleHandler(
  req: Request<object, object, CreateBundleBody>,
  res: Response
): Promise<void> {
  const { name, slug, description, discountPercent, productIds } = req.body;
  const createdBy = req.user!.id;

  if (productIds && productIds.length > 0) {
    const found = await prisma.product.count({
      where: { id: { in: productIds }, isBundle: false },
    });
    if (found !== productIds.length) {
      res.status(400).json({ message: "One or more product IDs not found" });
      return;
    }
  }

  try {
    const bundle = await prisma.$transaction(async (tx) => {
      const created = await tx.bundle.create({
        data: { name, slug, description: description ?? null, discountPercent: discountPercent ?? null, createdBy },
      });

      if (productIds && productIds.length > 0) {
        await tx.product.updateMany({
          where: { id: { in: productIds }, isBundle: false },
          data: { bundleId: created.id },
        });
      }

      return tx.bundle.findUnique({
        where: { id: created.id },
        include: { products: { where: { isBundle: false } } },
      });
    });

    res.status(201).json(formatBundle(bundle!));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ message: "A bundle with those details already exists" });
      return;
    }
    throw e;
  }
}
