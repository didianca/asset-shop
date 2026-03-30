import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { formatOrder } from "../utils.js";

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     summary: Get a single order
 *     description: Customers can only view their own orders. Admins can view any order.
 *     tags:
 *       - Orders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Invalid order ID
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
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function getOrderHandler(
  req: Request<{ id: string }>,
  res: Response
): Promise<void> {
  const user = req.user!;
  const { id } = req.params;

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
    user: { select: { email: true, firstName: true, lastName: true } },
  } as const;

  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });

  if (!order || (user.role !== "admin" && order.userId !== user.id)) {
    res.status(404).json({ message: "Order not found" });
    return;
  }

  res.status(200).json(formatOrder(order));
}
