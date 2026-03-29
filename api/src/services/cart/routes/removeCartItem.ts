import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { formatCart } from "../utils.js";

const cartInclude = {
  items: {
    include: {
      product: {
        select: { name: true, slug: true, price: true, discountPercent: true, previewKey: true },
      },
    },
  },
} as const;

/**
 * @openapi
 * /cart/items/{productId}:
 *   delete:
 *     summary: Remove a product from the cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Product removed from cart
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
 *       404:
 *         description: Cart or item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function removeCartItemHandler(
  req: Request<{ productId: string }>,
  res: Response
): Promise<void> {
  const userId = req.user!.id;
  const { productId } = req.params;

  const cart = await prisma.cart.findUnique({ where: { userId } });

  if (!cart) {
    res.status(404).json({ message: "Cart not found" });
    return;
  }

  const item = await prisma.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  if (!item) {
    res.status(404).json({ message: "Item not in cart" });
    return;
  }

  await prisma.cartItem.delete({
    where: { cartId_productId: { cartId: cart.id, productId } },
  });

  const updated = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: cartInclude,
  });

  res.status(200).json(formatCart(updated!));
}
