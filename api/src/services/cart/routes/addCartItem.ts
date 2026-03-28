import type { Request, Response } from "express";
import { Prisma } from "../../../generated/prisma/index.js";
import prisma from "../../../db.js";
import type { AddCartItemsBody } from "../cart.types.js";
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
 * /cart/items:
 *   post:
 *     summary: Add products to the cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddCartItemsBody'
 *     responses:
 *       200:
 *         description: Products added to cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartResponse'
 *       400:
 *         description: Validation error
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
 *         description: One or more products not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       409:
 *         description: One or more products already in cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function addCartItemHandler(
  req: Request<object, object, AddCartItemsBody>,
  res: Response
): Promise<void> {
  const userId = req.user!.id;
  const { productIds } = req.body;

  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    select: { id: true },
  });

  if (products.length !== productIds.length) {
    res.status(404).json({ message: "One or more products not found" });
    return;
  }

  try {
    const cart = await prisma.$transaction(async (tx) => {
      const userCart = await tx.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
      });

      await tx.cartItem.createMany({
        data: productIds.map((productId) => ({ cartId: userCart.id, productId })),
      });

      return tx.cart.findUnique({
        where: { id: userCart.id },
        include: cartInclude,
      });
    });

    res.status(200).json(formatCart(cart!));
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        res.status(409).json({ message: "One or more products already in cart" });
        return;
      }
      if (e.code === "P2003") {
        res.status(401).json({ message: "User not found" });
        return;
      }
    }
    throw e;
  }
}
