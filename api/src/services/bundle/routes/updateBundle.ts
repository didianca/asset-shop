import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/index.js";
import prisma from "../../../db.js";
import type { UpdateBundleBody } from "../bundle.types.js";
import { formatBundle } from "../utils.js";

/**
 * @openapi
 * /bundles/{id}:
 *   put:
 *     summary: Update a bundle
 *     description: Admin only. Updates bundle metadata and replaces its product list.
 *     tags:
 *       - Bundles
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
 *             $ref: '#/components/schemas/UpdateBundleBody'
 *     responses:
 *       200:
 *         description: Bundle updated
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
 *       404:
 *         description: Bundle not found
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
export async function updateBundleHandler(
  req: Request<{ id: string }, object, UpdateBundleBody>,
  res: Response
): Promise<void> {
  const { id } = req.params;
  const { name, slug, description, discountPercent, isActive, productIds } = req.body;

  const existing = await prisma.bundle.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ message: "Bundle not found" });
    return;
  }

  if (productIds.length > 0) {
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
      await tx.bundle.update({
        where: { id },
        data: { name, slug, description, discountPercent, isActive },
      });

      // Remove products no longer in this bundle
      await tx.product.updateMany({
        where: { bundleId: id, id: { notIn: productIds } },
        data: { bundleId: null },
      });

      // Assign new products to this bundle
      if (productIds.length > 0) {
        await tx.product.updateMany({
          where: { id: { in: productIds }, isBundle: false },
          data: { bundleId: id },
        });
      }

      return tx.bundle.findUnique({
        where: { id },
        include: { products: { where: { isBundle: false } } },
      });
    });

    res.status(200).json(formatBundle(bundle!));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      res.status(409).json({ message: "A bundle with those details already exists" });
      return;
    }
    throw e;
  }
}
