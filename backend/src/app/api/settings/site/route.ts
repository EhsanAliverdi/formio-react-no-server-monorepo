import { corsHeaders, jsonResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
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
    siteName: map.get(KEY_SITE_NAME) ?? null,
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
