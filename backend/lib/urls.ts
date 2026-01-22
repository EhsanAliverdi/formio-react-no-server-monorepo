function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

export function getPublicOrigin(req: Request) {
  const envBase = process.env.PUBLIC_API_BASE_URL || process.env.PUBLIC_BASE_URL || "";
  if (envBase) {
    return normalizeBaseUrl(envBase);
  }

  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = req.headers.get("host");
  if (host) {
    // Default to http because this API is typically served behind a reverse proxy that sets x-forwarded-proto.
    return `http://${host}`;
  }

  return new URL(req.url).origin;
}
