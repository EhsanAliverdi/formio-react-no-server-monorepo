// This file is overwritten during the Docker image build to bake in the
// app version and build time.
//
// For local dev (non-Docker), we fall back to Vite env vars if present.

const env = import.meta.env as unknown as Record<string, string | undefined>;

export const appVersion: string = (env.VITE_APP_VERSION ?? "").trim() || "unknown";
export const buildTime: string = (env.VITE_BUILD_TIME ?? "").trim() || "unknown";
export const appEnvironment: string = (env.VITE_APP_ENVIRONMENT ?? "").trim() || "development";
