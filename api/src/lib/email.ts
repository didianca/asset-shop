import {
  SESClient,
  SendEmailCommand,
  type SendEmailCommandInput,
} from "@aws-sdk/client-ses";
import { emailConfig } from "./email.config.js";

// SESClient is initialised once and reused across the app.
const sesClient = new SESClient({
  region: emailConfig.awsRegion,
  credentials: {
    accessKeyId: emailConfig.awsSesAccessKey,
    secretAccessKey: emailConfig.awsSesSecretAccessKey,
  },
});

// Sends a verification email with a link the user clicks to activate their account.
export async function sendVerificationEmail(
  toEmail: string,
  token: string
): Promise<void> {
  const verificationUrl = `${emailConfig.apiUrl}/auth/verify?token=${token}`;

  const params: SendEmailCommandInput = {
    Source: emailConfig.sesFromEmail,
    Destination: {
      ToAddresses: [toEmail],
    },
    Message: {
      Subject: {
        Data: "Verify your Asset Shop account",
        Charset: "UTF-8",
      },
      Body: {
        Html: {
          Data: `
            <h2>Welcome to Asset Shop</h2>
            <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
            <a href="${verificationUrl}">Verify my account</a>
            <p>If you did not create an account, you can safely ignore this email.</p>
          `,
          Charset: "UTF-8",
        },
        Text: {
          Data: `Welcome to Asset Shop. Verify your account: ${verificationUrl}. This link expires in 24 hours.`,
          Charset: "UTF-8",
        },
      },
    },
  };

  await sesClient.send(new SendEmailCommand(params));
}
