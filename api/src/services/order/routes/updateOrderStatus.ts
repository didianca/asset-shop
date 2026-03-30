import type { Request, Response } from "express";
import prisma from "../../../db.js";
import type { UpdateOrderStatusBody } from "../order.types.js";
import { isValidTransition, isWithinRefundWindow, formatOrder } from "../utils.js";
import { sendRefundConfirmationEmail, sendRefundDeniedEmail } from "../../../lib/email.js";

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
 * /orders/{id}/status:
 *   patch:
 *     summary: Update order status (admin only)
 *     description: |
 *       Transitions an order's status. Valid transitions:
 *       pending → paid, paid → fulfilled, paid → refund_pending, fulfilled → refund_pending,
 *       refund_pending → refunded (approve), refund_pending → paid/fulfilled (reject),
 *       refunded → pending.
 *       When approving a refund (refund_pending → refunded), the customer is emailed
 *       and a notification is created.
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
    include: {
      statusHistory: { orderBy: { createdAt: "asc" } },
      payment: true,
    },
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

    if (status === "refunded") {
      await tx.payment.updateMany({
        where: { orderId: id },
        data: { status: "refunded" },
      });
    }

    return tx.order.findUnique({
      where: { id },
      include: orderInclude,
    });
  });

  // When admin approves a refund, email the customer and create a notification.
  // Errors are logged but do not affect the 200 response.
  if (status === "refunded" && order.status === "refund_pending") {
    try {
      const items = updated!.items.map((item) => ({
        productName: item.product.name,
        unitPrice: Number(item.unitPrice).toFixed(2),
      }));

      const refundNote = order.statusHistory
        .find((h) => h.status === "refund_pending")?.note ?? "";

      await sendRefundConfirmationEmail(updated!.user!.email, {
        orderId: id,
        totalAmount: Number(updated!.totalAmount).toFixed(2),
        note: refundNote,
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
      console.error("[updateOrderStatus] Failed to send refund confirmation email", {
        orderId: id,
        error: String(err),
      });
    }
  }

  // When admin denies a refund, email the customer and create a notification.
  const isDenial =
    order.status === "refund_pending" &&
    (status === "paid" || status === "fulfilled");

  if (isDenial) {
    try {
      const items = updated!.items.map((item) => ({
        productName: item.product.name,
        unitPrice: Number(item.unitPrice).toFixed(2),
      }));

      const customerNote = order.statusHistory
        .find((h) => h.status === "refund_pending")?.note ?? "";

      await sendRefundDeniedEmail(updated!.user!.email, {
        orderId: id,
        totalAmount: Number(updated!.totalAmount).toFixed(2),
        customerNote,
        adminNote: note ?? "",
        items,
      });

      await prisma.notification.create({
        data: {
          userId: order.userId,
          type: "refund_denied",
          title: "Your refund request has been denied",
          message: `Your refund request of $${Number(updated!.totalAmount).toFixed(2)} was not approved.${note ? ` Reason: ${note}` : ""}`,
          metadata: { orderId: id },
        },
      });
    } catch (err) {
      console.error("[updateOrderStatus] Failed to send refund denied email", {
        orderId: id,
        error: String(err),
      });
    }
  }

  res.status(200).json(formatOrder(updated!));
}
