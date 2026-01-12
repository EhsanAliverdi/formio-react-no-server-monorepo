import crypto from "crypto";
import path from "path";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "http://localhost:9000";
const MINIO_REGION = process.env.MINIO_REGION || "us-east-1";
const MINIO_BUCKET = process.env.MINIO_BUCKET || "uploads";

const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || "minioadmin";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || "minioadmin";

const s3 = new S3Client({
  region: MINIO_REGION,
  endpoint: MINIO_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY,
    secretAccessKey: MINIO_SECRET_KEY,
  },
});

let ensured = false;

async function ensureBucketExists() {
  if (ensured) return;

  try {
    await s3.send(new HeadBucketCommand({ Bucket: MINIO_BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: MINIO_BUCKET }));
  }

  ensured = true;
}

function safeExtFromName(originalName: string, contentType: string) {
  const extFromName = path.extname(originalName || "").toLowerCase();
  if (extFromName && extFromName.length <= 10) return extFromName;

  const match = /^image\/(png|jpeg|jpg|gif|webp|bmp|svg\+xml)$/i.exec(contentType || "");
  if (!match) return "";
  const t = match[1].toLowerCase();
  if (t === "jpeg") return ".jpg";
  if (t === "svg+xml") return ".svg";
  return `.${t}`;
}

function randomKey(originalName: string, contentType: string) {
  const ext = safeExtFromName(originalName, contentType);
  const rand = crypto.randomBytes(16).toString("hex");
  const ymd = new Date().toISOString().slice(0, 10);
  return `images/${ymd}/${rand}${ext}`;
}

export type UploadedObject = {
  bucket: string;
  key: string;
  size: number;
  contentType: string;
};

export async function uploadImageObject(params: {
  bytes: Uint8Array;
  contentType: string;
  originalName: string;
}): Promise<UploadedObject> {
  await ensureBucketExists();

  const key = randomKey(params.originalName, params.contentType);

  await s3.send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: params.bytes,
      ContentType: params.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    bucket: MINIO_BUCKET,
    key,
    size: params.bytes.byteLength,
    contentType: params.contentType,
  };
}

export async function getObjectBytes(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  try {
    const out = await s3.send(
      new GetObjectCommand({
        Bucket: MINIO_BUCKET,
        Key: key,
      })
    );

    const body: any = out.Body;
    if (!body) return null;

    const bytes = typeof body.transformToByteArray === "function" ? await body.transformToByteArray() : null;
    if (!bytes) return null;

    return {
      bytes: new Uint8Array(bytes),
      contentType: typeof out.ContentType === "string" && out.ContentType ? out.ContentType : "application/octet-stream",
    };
  } catch {
    return null;
  }
}
