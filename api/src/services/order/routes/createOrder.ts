import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { effectivePrice, formatOrder } from "../utils.js";

const orderInclude = {
  items: {
    include: {
      product: {
        select: { name: true, slug: true, previewKey: true },
      },
    },
  },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  payment: true,
} as const;

/**
 * @openapi
 * /orders:
 *   post:
 *     summary: Create an order from the authenticated user's cart
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Cart is empty
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function createOrderHandler(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.id;

  const cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            select: { id: true, price: true, discountPercent: true },
          },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    res.status(400).json({ message: "Cart is empty" });
    return;
  }

  const order = await prisma.$transaction(async (tx) => {
    const itemsData = cart.items.map((item) => ({
      productId: item.product.id,
      unitPrice: effectivePrice(Number(item.product.price), item.product.discountPercent),
    }));

    const totalAmount = itemsData.reduce((sum, item) => sum + item.unitPrice, 0);

    const created = await tx.order.create({
      data: {
        userId,
        totalAmount: Math.round(totalAmount * 100) / 100,
        items: { create: itemsData },
        statusHistory: {
          create: { status: "pending", changedBy: userId, note: "Order created" },
        },
      },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return tx.order.findUnique({
      where: { id: created.id },
      include: orderInclude,
    });
  });

  res.status(201).json(formatOrder(order!));
}
