import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { uploadConfig } from "./upload.config.js";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: uploadConfig.awsS3Region,
      credentials: {
        accessKeyId: uploadConfig.awsS3AccessKey,
        secretAccessKey: uploadConfig.awsS3SecretAccessKey,
      },
    });
  }
  return s3Client;
}

export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string,
  isPublic = false
): Promise<string> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: uploadConfig.s3BucketName,
      Key: key,
      Body: body,
      ContentType: contentType,
      ...(isPublic && { ACL: "public-read" }),
    })
  );

  return key;
}

export function getPublicUrl(key: string): string {
  return `https://${uploadConfig.s3BucketName}.s3.${uploadConfig.awsS3Region}.amazonaws.com/${key}`;
}

export async function findKeyByPrefix(prefix: string): Promise<string | null> {
  const result = await getS3Client().send(
    new ListObjectsV2Command({
      Bucket: uploadConfig.s3BucketName,
      Prefix: prefix,
      MaxKeys: 1,
    })
  );

  return result.Contents?.[0]?.Key ?? null;
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: uploadConfig.s3BucketName,
    Key: key,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn });
}
