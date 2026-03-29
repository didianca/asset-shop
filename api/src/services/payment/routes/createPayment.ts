import type { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../../../db.js";
import { paymentConfig } from "../payment.config.js";
import type { CreatePaymentBody } from "../payment.types.js";

/**
 * @openapi
 * /payments:
 *   post:
 *     summary: Create a payment for a pending order
 *     description: Creates a Stripe PaymentIntent and returns the clientSecret for frontend confirmation.
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentBody'
 *     responses:
 *       201:
 *         description: PaymentIntent created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreatePaymentResponse'
 *       400:
 *         description: Order is not in pending status
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
 *       409:
 *         description: Payment already exists for this order
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function createPaymentHandler(
  req: Request<object, object, CreatePaymentBody>,
  res: Response
): Promise<void> {
  const user = req.user!;
  const { orderId } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payment: true },
  });

  if (!order || (user.role !== "admin" && order.userId !== user.id)) {
    res.status(404).json({ message: "Order not found" });
    return;
  }

  if (order.status !== "pending") {
    res.status(400).json({ message: "Order is not in pending status" });
    return;
  }

  if (order.payment) {
    res.status(409).json({ message: "Payment already exists for this order" });
    return;
  }

  const stripe = new Stripe(paymentConfig.stripeSecretKey);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(Number(order.totalAmount) * 100),
    currency: "usd",
    metadata: { orderId, userId: user.id },
  });

  const payment = await prisma.payment.create({
    data: {
      orderId,
      amount: Number(order.totalAmount),
      status: "pending",
      provider: "stripe",
      providerReference: paymentIntent.id,
    },
  });

  res.status(201).json({
    paymentId: payment.id,
    clientSecret: paymentIntent.client_secret,
  });
}
