// env-var uses a CommonJS default export and does not expose named exports
// compatible with ESM. Importing { from } directly fails at runtime.
import envVar from "env-var";
const { from } = envVar;

const env = from(process.env);

export const authConfig = {
  get jwtSecret(): string { return env.get("JWT_SECRET").required().asString(); },
};
