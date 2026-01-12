import { NextResponse } from "next/server";
import React from "react";
import { importIconPack, isReactIconPack } from "../_packs";

export const runtime = "nodejs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
} as const;

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

function escapeAttr(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function toSvgAttrName(key: string): string {
  if (key === "className") return "class";
  // Common SVG React prop conversions
  if (key === "strokeWidth") return "stroke-width";
  if (key === "strokeLinecap") return "stroke-linecap";
  if (key === "strokeLinejoin") return "stroke-linejoin";
  if (key === "strokeMiterlimit") return "stroke-miterlimit";
  if (key === "fillRule") return "fill-rule";
  if (key === "clipRule") return "clip-rule";
  if (key === "stopColor") return "stop-color";
  if (key === "stopOpacity") return "stop-opacity";
  if (key === "xlinkHref") return "xlink:href";
  return key;
}

function serializeReactSvgNode(node: unknown, depth = 0): string {
  if (depth > 10) return "";
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return escapeAttr(node);

  if (Array.isArray(node)) {
    return node.map(serializeReactSvgNode).join("");
  }

  if (!React.isValidElement(node)) return "";

  const type = node.type;
  const props = (node.props ?? {}) as Record<string, unknown>;

  // react-icons often returns a wrapper function component (e.g. IconBase)
  // which then returns the actual host <svg/> tree.
  if (typeof type !== "string") {
    try {
      if (typeof type === "function") {
        return serializeReactSvgNode((type as unknown as (p: unknown) => unknown)(props), depth + 1);
      }

      // forwardRef
      if (
        typeof type === "object" &&
        type &&
        "render" in type &&
        typeof (type as { render?: unknown }).render === "function"
      ) {
        const render = (type as unknown as { render: (p: unknown, ref: unknown) => unknown }).render;
        return serializeReactSvgNode(render(props, null), depth + 1);
      }
    } catch {
      return "";
    }

    // Unknown element type, not serializable.
    return "";
  }
  const children = props.children;

  const attrParts: string[] = [];
  for (const [rawKey, rawValue] of Object.entries(props)) {
    if (rawKey === "children" || rawKey === "key" || rawKey === "ref") continue;
    if (rawKey === "style") continue;
    if (rawKey.startsWith("on")) continue;
    if (rawValue == null || rawValue === false) continue;

    const key = toSvgAttrName(rawKey);
    if (rawValue === true) {
      attrParts.push(`${key}`);
      continue;
    }
    attrParts.push(`${key}="${escapeAttr(rawValue)}"`);
  }

  // Ensure xmlns on root svg
  const isRootSvg = type === "svg";
  if (isRootSvg && !("xmlns" in props)) {
    attrParts.push('xmlns="http://www.w3.org/2000/svg"');
  }

  const attrs = attrParts.length ? " " + attrParts.join(" ") : "";
  const inner = serializeReactSvgNode(children, depth + 1);
  return inner ? `<${type}${attrs}>${inner}</${type}>` : `<${type}${attrs}/>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pack = (searchParams.get("pack") ?? "").trim();
  const name = (searchParams.get("name") ?? "").trim();

  if (!isReactIconPack(pack)) {
    return NextResponse.json({ error: "Invalid pack" }, { status: 400, headers: corsHeaders });
  }

  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400, headers: corsHeaders });
  }

  const mod = await importIconPack(pack);
  const maybeIcon = (mod as Record<string, unknown>)[name];

  if (typeof maybeIcon !== "function") {
    return NextResponse.json({ error: "Icon not found" }, { status: 404, headers: corsHeaders });
  }

  const Icon = maybeIcon as unknown as (props: Record<string, unknown>) => React.ReactElement;

  // react-icons exports are plain function components that return an <svg /> tree.
  // Serializing the returned React element avoids importing `react-dom/server`,
  // which Turbopack disallows in this environment.
  const element = Icon({ size: 64 });
  const svg = serializeReactSvgNode(element);

  if (!svg.startsWith("<svg")) {
    return NextResponse.json(
      { error: "Failed to render icon" },
      { status: 500, headers: corsHeaders },
    );
  }

  return new NextResponse(svg, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
