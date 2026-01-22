import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const envDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
const envPath = path.join(envDir, envFile);

const parseEnvLine = (line: string) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const index = trimmed.indexOf("=");
  if (index < 0) return null;
  const key = trimmed.slice(0, index).trim();
  let value = trimmed.slice(index + 1).trim();
  if (!key) return null;
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
};

if (fs.existsSync(envPath)) {
  const contents = fs.readFileSync(envPath, "utf8");
  for (const line of contents.split("\n")) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;
    if (typeof process.env[parsed.key] === "undefined") {
      process.env[parsed.key] = parsed.value;
    }
  }
}

const nextConfig: NextConfig = {
  experimental: {
    // Docker Desktop / some CPUs can crash loading the native SWC binary (SIGBUS).
    // Use the WASM SWC binary instead for stability.
    useWasmBinary: true,
  },
};

export default nextConfig;
