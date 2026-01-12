import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Docker Desktop / some CPUs can crash loading the native SWC binary (SIGBUS).
    // Use the WASM SWC binary instead for stability.
    useWasmBinary: true,
  },
};

export default nextConfig;
