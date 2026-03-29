import envVar from "env-var";

const { from } = envVar;
const env = from(process.env);

export const uploadConfig = {
  get awsS3AccessKey(): string {
    return env.get("AWS_S3_ACCESS_KEY").required().asString();
  },
  get awsS3SecretAccessKey(): string {
    return env.get("AWS_S3_SECRET_ACCESS_KEY").required().asString();
  },
  get awsS3Region(): string {
    return env.get("AWS_S3_REGION").required().asString();
  },
  get s3BucketName(): string {
    return env.get("S3_BUCKET_NAME").required().asString();
  },
};
