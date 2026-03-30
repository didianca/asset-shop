import envVar from "env-var";
const { from } = envVar;

const env = from(process.env);

export const appConfig = {
  get corsOrigin(): string | false {
    return env.get("APP_URL").asString() || false;
  },
  get s3Origin(): string | undefined {
    const bucket = env.get("S3_BUCKET_NAME").asString();
    const region = env.get("AWS_S3_REGION").asString();
    if (bucket && region) return `https://${bucket}.s3.${region}.amazonaws.com`;
    return undefined;
  },
};
