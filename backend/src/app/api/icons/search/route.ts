import { NextResponse } from "next/server";
import { importIconPack, isReactIconPack } from "../_packs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

function toInt(value: string | null, fallback: number): number {
  const n = value ? Number.parseInt(value, 10) : Number.NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pack = (searchParams.get("pack") ?? "").trim();
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const limit = Math.min(Math.max(toInt(searchParams.get("limit"), 240), 1), 500);

  if (!isReactIconPack(pack)) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400, headers: corsHeaders });
  }

  const mod = await importIconPack(pack);
  const names = Object.keys(mod)
    .filter((k) => k && k !== "default")
    .filter((k) => {
      const value = (mod as Record<string, unknown>)[k];
      return typeof value === "function";
    })
    .filter((k) => (q ? k.toLowerCase().includes(q) : true))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);

  return NextResponse.json({ items: names }, { headers: corsHeaders });
}
