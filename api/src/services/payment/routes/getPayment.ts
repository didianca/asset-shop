import type { Request, Response } from "express";
import prisma from "../../../db.js";
import { formatPayment } from "../utils.js";

/**
 * @openapi
 * /payments/{orderId}:
 *   get:
 *     summary: Get payment for an order
 *     description: Customers can only view payments for their own orders. Admins can view any.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Payment retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function getPaymentHandler(
  req: Request<{ orderId: string }>,
  res: Response
): Promise<void> {
  const user = req.user!;
  const { orderId } = req.params;

  const payment = await prisma.payment.findUnique({
    where: { orderId },
    include: { order: { select: { userId: true } } },
  });

  if (!payment || (user.role !== "admin" && payment.order.userId !== user.id)) {
    res.status(404).json({ message: "Payment not found" });
    return;
  }

  res.status(200).json(formatPayment(payment));
}
