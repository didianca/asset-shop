import type { Request, Response } from "express";
import prisma from "../../../db.js";
import type { RefundRequestBody } from "../order.types.js";
import { isValidTransition, isWithinRefundWindow, formatOrder } from "../utils.js";
import { sendRefundConfirmationEmail } from "../../../lib/email.js";

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
 *         description: Refund processed
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

  if (!isValidTransition(order.status, "refunded")) {
    res.status(400).json({ message: `Cannot refund an order with status '${order.status}'` });
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
      data: { status: "refunded" },
    });

    await tx.orderStatusHistory.create({
      data: { orderId: id, status: "refunded", note, changedBy: userId },
    });

    if (order.payment) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: "refunded" },
      });
    }

    return tx.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  });

  // Send refund confirmation email and create notification.
  // Errors are logged but do not affect the 200 response.
  try {
    const items = updated!.items.map((item) => ({
      productName: item.product.name,
      unitPrice: Number(item.unitPrice).toFixed(2),
    }));

    await sendRefundConfirmationEmail(updated!.user!.email, {
      orderId: id,
      totalAmount: Number(updated!.totalAmount).toFixed(2),
      note,
      items,
    });

    await prisma.notification.create({
      data: {
        userId: order.userId,
        type: "order_refunded",
        title: "Your refund has been processed",
        message: `Your refund of $${Number(updated!.totalAmount).toFixed(2)} has been approved and is on its way.`,
        metadata: { orderId: id },
      },
    });
  } catch (err) {
    console.error("[requestRefund] Failed to send refund confirmation email", {
      orderId: id,
      error: String(err),
    });
  }

  res.status(200).json(formatOrder(updated!));
}
