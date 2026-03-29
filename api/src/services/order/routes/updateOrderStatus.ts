import type { Request, Response } from "express";
import prisma from "../../../db.js";
import type { UpdateOrderStatusBody } from "../order.types.js";
import { isValidTransition, isWithinRefundWindow, formatOrder } from "../utils.js";

const orderInclude = {
  items: {
    include: {
      product: {
        select: { name: true, slug: true, previewUrl: true },
      },
    },
  },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  payment: true,
} as const;

/**
 * @openapi
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status (admin only)
 *     description: |
 *       Transitions an order's status. Valid transitions:
 *       pending → paid, paid → fulfilled, fulfilled → refunded (within 30 days).
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderStatusBody'
 *     responses:
 *       200:
 *         description: Order status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Invalid status transition or refund window expired
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
 *       403:
 *         description: Admin access required
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
export async function updateOrderStatusHandler(
  req: Request<{ id: string }, object, UpdateOrderStatusBody>,
  res: Response
): Promise<void> {
  const adminId = req.user!.id;
  const { id } = req.params;
  const { status, note } = req.body;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { statusHistory: { orderBy: { createdAt: "asc" } } },
  });

  if (!order) {
    res.status(404).json({ message: "Order not found" });
    return;
  }

  if (!isValidTransition(order.status, status)) {
    res.status(400).json({ message: `Invalid transition from '${order.status}' to '${status}'` });
    return;
  }

  if (status === "refunded") {
    const fulfilledEntry = order.statusHistory.find((h) => h.status === "fulfilled");
    if (fulfilledEntry && !isWithinRefundWindow(fulfilledEntry.createdAt)) {
      res.status(400).json({ message: "Refund window has expired (30 days from fulfillment)" });
      return;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status },
    });

    await tx.orderStatusHistory.create({
      data: { orderId: id, status, note: note ?? null, changedBy: adminId },
    });

    return tx.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  });

  res.status(200).json(formatOrder(updated!));
}
