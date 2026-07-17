import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION || "us-east-1";
export const S3_BUCKET = process.env.S3_BUCKET || "";

export const s3 = new S3Client({
  region,
  // Credentials are read automatically from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
});

const PRESIGN_EXPIRES = 60 * 15; // 15 minutes

/** Presigned URL for uploading (HTTP PUT) an object. */
export function presignPut(key: string, contentType?: string) {
  const cmd = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, cmd, { expiresIn: PRESIGN_EXPIRES });
}

/** Presigned URL for downloading (HTTP GET) an object. */
export function presignGet(key: string) {
  const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: PRESIGN_EXPIRES });
}

// ---------- S3 key builders ----------

export const s3keys = {
  rom: (gameId: string, filename: string) =>
    `roms/${gameId}/${sanitize(filename)}`,
  save: (userId: string, gameId: string, slot: number) =>
    `saves/${userId}/${gameId}/${slot}.state`,
  screenshot: (userId: string, gameId: string, slot: number) =>
    `screenshots/${userId}/${gameId}/${slot}.png`,
  cover: (gameId: string) => `covers/${gameId}.png`,
};

export function sanitize(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
