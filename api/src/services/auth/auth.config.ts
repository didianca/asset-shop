import { from } from "env-var";

const env = from(process.env);

export const authConfig = {
  get jwtSecret(): string { return env.get("JWT_SECRET").required().asString(); },
};
