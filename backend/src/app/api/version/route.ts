import { corsHeaders, jsonResponse } from "@/lib/auth";
import { readFile } from "fs/promises";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  let version = (process.env.APP_VERSION ?? "").trim();
  let buildTime = (process.env.BUILD_TIME ?? "").trim();
  let environment = (process.env.APP_ENVIRONMENT ?? "").trim();

  if (!version || !buildTime || !environment) {
    try {
      const raw = await readFile(".buildinfo.json", "utf8");
      const parsed = JSON.parse(raw) as { version?: string; buildTime?: string; environment?: string };
      if (!version) version = (parsed.version ?? "").trim();
      if (!buildTime) buildTime = (parsed.buildTime ?? "").trim();
      if (!environment) environment = (parsed.environment ?? "").trim();
    } catch {
      // ignore
    }
  }

  if (!version) version = "unknown";
  if (!buildTime) buildTime = "unknown";
  if (!environment) environment = "unknown";

  return jsonResponse({
    name: "backend",
    version,
    buildTime,
    environment,
  });
}
