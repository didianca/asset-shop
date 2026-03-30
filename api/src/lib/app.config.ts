import envVar from "env-var";
const { from } = envVar;

const env = from(process.env);

export const appConfig = {
  get corsOrigin(): string | false {
    return env.get("APP_URL").asString() || false;
  },
};
