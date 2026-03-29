import envVar from "env-var";

const { from } = envVar;
const env = from(process.env);

export const paymentConfig = {
  get stripeSecretKey(): string {
    return env.get("STRIPE_SECRET_KEY").required().asString();
  },
  get stripeWebhookSecret(): string {
    return env.get("STRIPE_WEBHOOK_SECRET").required().asString();
  },
};
