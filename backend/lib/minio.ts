import { buildImagesKey, downloadObject, uploadObject, type StoredObject } from "@/lib/storage";

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
  const key = buildImagesKey(params.originalName, params.contentType);
  const obj: StoredObject = await uploadObject({
    key,
    bytes: params.bytes,
    contentType: params.contentType,
    cacheControl: "public, max-age=31536000, immutable",
  });

  return obj;
}

export async function getObjectBytes(key: string): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  return downloadObject(key);
}
