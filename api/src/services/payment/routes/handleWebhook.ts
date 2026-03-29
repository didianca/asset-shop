import type { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../../../db.js";
import { paymentConfig } from "../payment.config.js";

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     summary: Handle Stripe webhook events
 *     description: |
 *       Receives webhook events from Stripe. Verifies the signature and processes
 *       payment_intent.succeeded and payment_intent.payment_failed events.
 *       This endpoint does not require authentication — it uses Stripe signature verification.
 *     tags:
 *       - Payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: Invalid signature or missing header
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
export async function handleWebhookHandler(
  req: Request,
  res: Response
): Promise<void> {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    res.status(400).json({ message: "Missing stripe-signature header" });
    return;
  }

  const stripe = new Stripe(paymentConfig.stripeSecretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      signature,
      paymentConfig.stripeWebhookSecret
    );
  } catch {
    res.status(400).json({ message: "Invalid signature" });
    return;
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const payment = await prisma.payment.findFirst({
      where: { providerReference: paymentIntent.id },
    });

    if (!payment) {
      res.status(200).json({ message: "Payment not found, skipping" });
      return;
    }

    if (payment.status === "captured") {
      res.status(200).json({ message: "Already processed" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "captured",
          metadata: JSON.parse(JSON.stringify(paymentIntent)),
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: "paid" },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: payment.orderId,
          status: "paid",
          note: "Payment captured via Stripe",
        },
      });
    });

    res.status(200).json({ message: "Payment captured" });
    return;
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const payment = await prisma.payment.findFirst({
      where: { providerReference: paymentIntent.id },
    });

    if (!payment) {
      res.status(200).json({ message: "Payment not found, skipping" });
      return;
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        metadata: JSON.parse(JSON.stringify(paymentIntent)),
      },
    });

    res.status(200).json({ message: "Payment failure recorded" });
    return;
  }

  res.status(200).json({ message: "Event type not handled" });
}
