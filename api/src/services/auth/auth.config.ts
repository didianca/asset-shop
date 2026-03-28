import envVar from "env-var";
const { from } = envVar;

const env = from(process.env);

export const authConfig = {
  get jwtSecret(): string { return env.get("JWT_SECRET").required().asString(); },
};
