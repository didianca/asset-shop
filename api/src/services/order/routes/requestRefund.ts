import type { Request, Response } from "express";
import prisma from "../../../db.js";
import type { RefundRequestBody } from "../order.types.js";
import { isValidTransition, isWithinRefundWindow, formatOrder } from "../utils.js";

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

/**
 * @openapi
 * /orders/{id}/refund:
 *   post:
 *     summary: Request a refund (customer)
 *     description: |
 *       Customers can request a refund for their own paid or fulfilled orders.
 *       A reason (note) is required. The 30-day refund window is enforced for fulfilled orders.
 *       The order is moved to `refund_pending` until an admin reviews and confirms the refund.
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
 *             $ref: '#/components/schemas/RefundRequestBody'
 *     responses:
 *       200:
 *         description: Refund request submitted for admin review
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrderResponse'
 *       400:
 *         description: Validation error, invalid status transition, or refund window expired
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
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function requestRefundHandler(
  req: Request<{ id: string }, object, RefundRequestBody>,
  res: Response
): Promise<void> {
  const userId = req.user!.id;
  const { id } = req.params;
  const { note } = req.body;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      statusHistory: { orderBy: { createdAt: "asc" } },
      payment: true,
    },
  });

  if (!order || order.userId !== userId) {
    res.status(404).json({ message: "Order not found" });
    return;
  }

  if (!isValidTransition(order.status, "refund_pending")) {
    res.status(400).json({ message: `Cannot request refund for an order with status '${order.status}'` });
    return;
  }

  if (order.status === "fulfilled") {
    const fulfilledEntry = order.statusHistory.find((h) => h.status === "fulfilled");
    if (fulfilledEntry && !isWithinRefundWindow(fulfilledEntry.createdAt)) {
      res.status(400).json({ message: "Refund window has expired (30 days from fulfillment)" });
      return;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: "refund_pending" },
    });

    await tx.orderStatusHistory.create({
      data: { orderId: id, status: "refund_pending", note, changedBy: userId },
    });

    return tx.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  });

  res.status(200).json(formatOrder(updated!));
}
