import { from } from "env-var";

const env = from(process.env);

export const emailConfig = {
  get awsRegion() { return env.get("AWS_REGION").required().asString(); },
  get awsSesAccessKey() { return env.get("AWS_SES_ACCESS_KEY").required().asString(); },
  get awsSesSecretAccessKey() { return env.get("AWS_SES_SECRET_ACCESS_KEY").required().asString(); },
  get sesFromEmail() { return env.get("SES_FROM_EMAIL").required().asString(); },
  get apiUrl() { return env.get("API_URL").required().asString(); },
};
