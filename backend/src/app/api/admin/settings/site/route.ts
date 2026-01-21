import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

const KEY_FAVICON = "favicon_url";
const KEY_LOGO_EXPANDED_LIGHT = "logo_expanded_light_url";
const KEY_LOGO_EXPANDED_DARK = "logo_expanded_dark_url";
const KEY_LOGO_COLLAPSED = "logo_collapsed_url";
const KEY_LOGO_EXPANDED_WIDTH = "logo_expanded_width";
const KEY_LOGO_EXPANDED_HEIGHT = "logo_expanded_height";
const KEY_LOGO_COLLAPSED_SIZE = "logo_collapsed_size";
const KEY_SITE_NAME = "site_name";

function parseNumber(value: string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function mapRowsToPayload(rows: Array<{ key: string; value: string }>) {
  const map = new Map<string, string>();
  for (const r of rows) {
    if (!r || typeof r.key !== "string") continue;
    map.set(r.key, r.value ?? "");
  }

  return {
    siteName: normalizeString(map.get(KEY_SITE_NAME)) ?? null,
    faviconUrl: map.get(KEY_FAVICON) ?? null,
    logoExpandedLightUrl: map.get(KEY_LOGO_EXPANDED_LIGHT) ?? null,
    logoExpandedDarkUrl: map.get(KEY_LOGO_EXPANDED_DARK) ?? null,
    logoCollapsedUrl: map.get(KEY_LOGO_COLLAPSED) ?? null,
    logoExpandedWidth: parseNumber(map.get(KEY_LOGO_EXPANDED_WIDTH)),
    logoExpandedHeight: parseNumber(map.get(KEY_LOGO_EXPANDED_HEIGHT)),
    logoCollapsedSize: parseNumber(map.get(KEY_LOGO_COLLAPSED_SIZE)),
  };
}

export async function GET(req: Request) {
  // Allow unauthenticated GET for public site settings
  const rows = await prisma.siteSetting.findMany({
    where: {
      key: {
        in: [
          KEY_SITE_NAME,
          KEY_FAVICON,
          KEY_LOGO_EXPANDED_LIGHT,
          KEY_LOGO_EXPANDED_DARK,
          KEY_LOGO_COLLAPSED,
          KEY_LOGO_EXPANDED_WIDTH,
          KEY_LOGO_EXPANDED_HEIGHT,
          KEY_LOGO_COLLAPSED_SIZE,
        ],
      },
    },
  });

  return jsonResponse(mapRowsToPayload(rows as Array<{ key: string; value: string }>));
}

export async function PUT(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Expected JSON body" }, { status: 400 });
  }

  const faviconUrl = normalizeString((body as any)?.faviconUrl);
  const logoExpandedLightUrl = normalizeString((body as any)?.logoExpandedLightUrl);
  const logoExpandedDarkUrl = normalizeString((body as any)?.logoExpandedDarkUrl);
  const logoCollapsedUrl = normalizeString((body as any)?.logoCollapsedUrl);
  const siteName = normalizeString((body as any)?.siteName);

  const logoExpandedWidthRaw = (body as any)?.logoExpandedWidth;
  const logoExpandedHeightRaw = (body as any)?.logoExpandedHeight;
  const logoCollapsedSizeRaw = (body as any)?.logoCollapsedSize;

  const logoExpandedWidth =
    typeof logoExpandedWidthRaw === "number" && Number.isFinite(logoExpandedWidthRaw)
      ? logoExpandedWidthRaw
      : null;
  const logoExpandedHeight =
    typeof logoExpandedHeightRaw === "number" && Number.isFinite(logoExpandedHeightRaw)
      ? logoExpandedHeightRaw
      : null;
  const logoCollapsedSize =
    typeof logoCollapsedSizeRaw === "number" && Number.isFinite(logoCollapsedSizeRaw)
      ? logoCollapsedSizeRaw
      : null;

  const upserts: Array<{ key: string; value: string | null }> = [
    { key: KEY_SITE_NAME, value: siteName },
    { key: KEY_FAVICON, value: faviconUrl },
    { key: KEY_LOGO_EXPANDED_LIGHT, value: logoExpandedLightUrl },
    { key: KEY_LOGO_EXPANDED_DARK, value: logoExpandedDarkUrl },
    { key: KEY_LOGO_COLLAPSED, value: logoCollapsedUrl },
    {
      key: KEY_LOGO_EXPANDED_WIDTH,
      value: logoExpandedWidth != null ? String(logoExpandedWidth) : null,
    },
    {
      key: KEY_LOGO_EXPANDED_HEIGHT,
      value: logoExpandedHeight != null ? String(logoExpandedHeight) : null,
    },
    {
      key: KEY_LOGO_COLLAPSED_SIZE,
      value: logoCollapsedSize != null ? String(logoCollapsedSize) : null,
    },
  ];

  for (const { key, value } of upserts) {
    if (value === null) {
      // Ignore if the key does not exist.
      await prisma.siteSetting.delete({ where: { key } }).catch(() => {});
    } else {
      await prisma.siteSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
  }

  const rows = await prisma.siteSetting.findMany({
    where: {
      key: {
        in: [
          KEY_FAVICON,
          KEY_LOGO_EXPANDED_LIGHT,
          KEY_LOGO_EXPANDED_DARK,
          KEY_LOGO_COLLAPSED,
          KEY_LOGO_EXPANDED_WIDTH,
          KEY_LOGO_EXPANDED_HEIGHT,
          KEY_LOGO_COLLAPSED_SIZE,
        ],
      },
    },
  });

  return jsonResponse(mapRowsToPayload(rows as Array<{ key: string; value: string }>));
}
