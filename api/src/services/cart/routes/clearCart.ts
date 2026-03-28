import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { formatCart } from "../utils.js";

/**
 * @openapi
 * /cart:
 *   delete:
 *     summary: Clear all items from the cart
 *     tags:
 *       - Cart
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cart cleared
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
 *         description: Cart not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function clearCartHandler(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.id;

  const cart = await prisma.cart.findUnique({ where: { userId } });

  if (!cart) {
    res.status(404).json({ message: "Cart not found" });
    return;
  }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  res.status(200).json(formatCart({ id: cart.id, items: [] }));
}
