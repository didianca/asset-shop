import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-ses";
import { emailConfig } from "./email.config.js";
import {
  orderConfirmationHtml,
  type OrderConfirmationData,
} from "./templates/orderConfirmation.js";
import {
  refundConfirmationHtml,
  type RefundConfirmationData,
} from "./templates/refundConfirmation.js";
import { verificationEmailHtml } from "./templates/verificationEmail.js";

// SESClient is initialised once and reused across the app.
const sesClient = new SESClient({
  region: emailConfig.awsRegion,
  credentials: {
    accessKeyId: emailConfig.awsSesAccessKey,
    secretAccessKey: emailConfig.awsSesSecretAccessKey,
  },
});

// Sends an order confirmation email with an inline invoice and presigned S3 download links.
export async function sendOrderConfirmationEmail(
  toEmail: string,
  order: OrderConfirmationData
): Promise<void> {
  const formattedDate = order.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const text = [
    "Your Asset Shop order is confirmed!",
    "",
    `Order ID: ${order.id}`,
    `Date: ${formattedDate}`,
    "",
    "--- Invoice ---",
    ...order.items.map((item) => `${item.productName}  $${item.unitPrice}`),
    `Total  $${order.totalAmount}`,
    "",
    "--- Downloads (expire in 7 days) ---",
    ...order.items.map((item) => `${item.productName}: ${item.downloadUrl}`),
  ].join("\n");

  const params: SendEmailCommandInput = {
    Source: emailConfig.sesFromEmail,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: {
        Data: `Your Asset Shop order #${order.id.slice(0, 8).toUpperCase()} is ready`,
        Charset: "UTF-8",
      },
      Body: {
        Html: { Data: orderConfirmationHtml(order), Charset: "UTF-8" },
        Text: { Data: text, Charset: "UTF-8" },
      },
    },
  };

  await sesClient.send(new SendEmailCommand(params));
}

// Sends a refund confirmation email notifying the user their refund has been processed.
export async function sendRefundConfirmationEmail(
  toEmail: string,
  refund: RefundConfirmationData
): Promise<void> {
  const text = [
    "Your Asset Shop refund has been processed.",
    "",
    `Order ID: ${refund.orderId}`,
    `Reason: ${refund.note}`,
    "",
    "--- Items Refunded ---",
    ...refund.items.map((item) => `${item.productName}  $${item.unitPrice}`),
    `Refund Total  $${refund.totalAmount}`,
    "",
    "Please allow 5–10 business days for the amount to appear on your statement.",
  ].join("\n");

  const params: SendEmailCommandInput = {
    Source: emailConfig.sesFromEmail,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: {
        Data: `Your refund for order #${refund.orderId.slice(0, 8).toUpperCase()} has been processed`,
        Charset: "UTF-8",
      },
      Body: {
        Html: { Data: refundConfirmationHtml(refund), Charset: "UTF-8" },
        Text: { Data: text, Charset: "UTF-8" },
      },
    },
  };

  await sesClient.send(new SendEmailCommand(params));
}

// Sends a verification email with a link the user clicks to activate their account.
export async function sendVerificationEmail(
  toEmail: string,
  token: string
): Promise<void> {
  const verificationUrl = `${emailConfig.appUrl}/verify-email?token=${token}`;

  const params: SendEmailCommandInput = {
    Source: emailConfig.sesFromEmail,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: {
        Data: "Verify your Asset Shop account",
        Charset: "UTF-8",
      },
      Body: {
        Html: { Data: verificationEmailHtml(verificationUrl), Charset: "UTF-8" },
        Text: {
          Data: `Welcome to Asset Shop. Verify your account: ${verificationUrl}. This link expires in 24 hours.`,
          Charset: "UTF-8",
        },
      },
    },
  };

  await sesClient.send(new SendEmailCommand(params));
}
