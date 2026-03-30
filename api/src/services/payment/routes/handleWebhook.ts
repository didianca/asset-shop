import type { Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../../../db.js";
import { paymentConfig } from "../payment.config.js";
import { getPresignedUrl } from "../../upload/s3.js";
import { sendOrderConfirmationEmail } from "../../../lib/email.js";

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
// TODO: connect stripe webhook in prod env — register this endpoint in the Stripe dashboard
//       under Developers → Webhooks, set STRIPE_WEBHOOK_SECRET from the signing secret provided.
export async function handleWebhookHandler(
  req: Request,
  res: Response
): Promise<void> {
  const signature = req.headers["stripe-signature"];

  console.info("[webhook] Incoming request", {
    hasSignature: !!signature,
    contentType: req.headers["content-type"],
    bodySize: Buffer.isBuffer(req.body) ? req.body.length : undefined,
  });

  if (!signature) {
    console.warn("[webhook] Missing stripe-signature header");
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
  } catch (err) {
    console.error("[webhook] Signature verification failed", {
      error: err instanceof Error ? err.message : err,
    });
    res.status(400).json({ message: "Invalid signature" });
    return;
  }

  console.info("[webhook] Event verified", {
    eventId: event.id,
    type: event.type,
  });

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const payment = await prisma.payment.findFirst({
      where: { providerReference: paymentIntent.id },
    });

    if (!payment) {
      console.warn("[webhook:succeeded] No matching payment found", {
        providerReference: paymentIntent.id,
        eventId: event.id,
      });
      res.status(200).json({ message: "Payment not found, skipping" });
      return;
    }

    if (payment.status === "captured") {
      console.info("[webhook:succeeded] Already processed, skipping", {
        paymentId: payment.id,
        orderId: payment.orderId,
      });
      res.status(200).json({ message: "Already processed" });
      return;
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "captured",
            metadata: JSON.parse(JSON.stringify(paymentIntent)),
          },
        });

        const order = await tx.order.update({
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

        // Clear the user's cart now that payment has succeeded
        const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
      });

      console.info("[webhook:succeeded] Payment captured", {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      });
    } catch (err) {
      console.error("[webhook:succeeded] Transaction failed", {
        paymentId: payment.id,
        orderId: payment.orderId,
        error: err instanceof Error ? err.message : err,
      });
      throw err;
    }

    // Fetch order details and send confirmation email with download links.
    // Errors here are logged but do not affect the 200 response to Stripe.
    try {
      const orderWithDetails = await prisma.order.findUnique({
        where: { id: payment.orderId },
        include: {
          user: { select: { id: true, email: true } },
          items: {
            include: {
              product: { select: { name: true, assetKey: true, isBundle: true, bundleId: true } },
            },
          },
        },
      });

      if (orderWithDetails) {
        const SEVEN_DAYS = 7 * 24 * 3600;
        const items = (await Promise.all(
          orderWithDetails.items.map(async (item) => {
            if (item.product.isBundle && item.product.bundleId) {
              // Bundle purchased — send download links for all member products, not the bundle row itself
              const memberProducts = await prisma.product.findMany({
                where: { bundleId: item.product.bundleId, isBundle: false, isActive: true },
                select: { name: true, assetKey: true },
              });
              return Promise.all(
                memberProducts.map(async (member) => ({
                  productName: member.name,
                  unitPrice: (Number(item.unitPrice) / memberProducts.length).toFixed(2),
                  downloadUrl: await getPresignedUrl(member.assetKey, SEVEN_DAYS),
                }))
              );
            }
            return {
              productName: item.product.name,
              unitPrice: Number(item.unitPrice).toFixed(2),
              downloadUrl: await getPresignedUrl(item.product.assetKey, SEVEN_DAYS),
            };
          })
        )).flat();

        await sendOrderConfirmationEmail(orderWithDetails.user.email, {
          id: orderWithDetails.id,
          createdAt: orderWithDetails.createdAt,
          totalAmount: Number(orderWithDetails.totalAmount).toFixed(2),
          items,
        });

        await prisma.$transaction([
          prisma.order.update({
            where: { id: payment.orderId },
            data: { status: "fulfilled" },
          }),
          prisma.orderStatusHistory.create({
            data: {
              orderId: payment.orderId,
              status: "fulfilled",
              note: "Download link delivered via email",
            },
          }),
          prisma.notification.create({
            data: {
              userId: orderWithDetails.user.id,
              type: "order_fulfilled",
              title: "Your download is ready",
              message: "Check your email for download links to your purchased assets.",
              metadata: { orderId: payment.orderId },
            },
          }),
        ]);

        console.info("[webhook:succeeded] Order fulfilled, confirmation email sent", {
          orderId: payment.orderId,
          toEmail: orderWithDetails.user.email,
          itemCount: items.length,
        });
      }
    } catch (err) {
      // GAP: payment is captured but the email failed — customer paid and never received their
      // download links. Order stays in "paid" (not "fulfilled") with no recovery path.
      // Note: SES retries soft bounces internally for up to 72 hours but we have no visibility.
      // TODO: subscribe SNS to SES event notifications to detect failed deliveries and re-queue
      //       the confirmation email for orders stuck in "paid".
      console.error("[webhook:succeeded] Failed to fulfill order after payment", {
        paymentId: payment.id,
        orderId: payment.orderId,
        error: err instanceof Error ? err.message : err,
      });
    }

    res.status(200).json({ message: "Payment captured" });
    return;
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    const payment = await prisma.payment.findFirst({
      where: { providerReference: paymentIntent.id },
    });

    if (!payment) {
      console.warn("[webhook:failed] No matching payment found", {
        providerReference: paymentIntent.id,
        eventId: event.id,
      });
      res.status(200).json({ message: "Payment not found, skipping" });
      return;
    }

    try {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "failed",
          metadata: JSON.parse(JSON.stringify(paymentIntent)),
        },
      });

      console.warn("[webhook:failed] Payment failure recorded", {
        paymentId: payment.id,
        orderId: payment.orderId,
        failureCode: paymentIntent.last_payment_error?.code,
        failureMessage: paymentIntent.last_payment_error?.message,
      });
    } catch (err) {
      console.error("[webhook:failed] DB update failed", {
        paymentId: payment.id,
        orderId: payment.orderId,
        error: err instanceof Error ? err.message : err,
      });
      throw err;
    }

    res.status(200).json({ message: "Payment failure recorded" });
    return;
  }

  console.info("[webhook] Unhandled event type", {
    type: event.type,
    eventId: event.id,
  });
  res.status(200).json({ message: "Event type not handled" });
}
