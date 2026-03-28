import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { formatCart } from "../utils.js";

const cartInclude = {
  items: {
    include: {
      product: {
        select: { name: true, slug: true, price: true, discountPercent: true, previewUrl: true },
      },
    },
  },
} as const;

/**
 * @openapi
 * /cart:
 *   get:
 *     summary: Get the authenticated user's cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart retrieved (created automatically if it didn't exist)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function getCartHandler(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.id;

  const cart = await prisma.cart.upsert({
    where: { userId },
    create: { userId },
    update: {},
    include: cartInclude,
  });

  res.status(200).json(formatCart(cart));
}
