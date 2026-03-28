// env-var uses a CommonJS default export and does not expose named exports
// compatible with ESM. Importing { from } directly fails at runtime.
import envVar from "env-var";
const { from } = envVar;

const env = from(process.env);

export const emailConfig = {
  get awsRegion(): string { return env.get("AWS_REGION").required().asString(); },
  get awsSesAccessKey(): string { return env.get("AWS_SES_ACCESS_KEY").required().asString(); },
  get awsSesSecretAccessKey(): string { return env.get("AWS_SES_SECRET_ACCESS_KEY").required().asString(); },
  get sesFromEmail(): string { return env.get("SES_FROM_EMAIL").required().asString(); },
  get apiUrl(): string { return env.get("API_URL").required().asString(); },
};
