import { useEffect, useMemo, useState } from "react";

import { apiFetch } from "../services/apiClient";
import {
  appEnvironment as bakedAppEnvironment,
  appVersion as bakedFrontendVersion,
  buildTime as bakedFrontendBuildTime,
} from "../../generated/buildInfo";

export type AppVersionInfo = {
  appVersion: string;
  frontend: {
    version: string;
    buildTime: string;
  };
  backend: {
    version: string;
    buildTime: string;
  };
  environment: {
    raw: string;
    label: string;
  };
  showDetailed: boolean;
};

type VersionPayload = {
  name?: string;
  version?: string;
  buildTime?: string | null;
  environment?: string | null;
};

function formatBuildTime(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "unknown";
  if (raw.toLowerCase() === "unknown") return "unknown";

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;

  const pad = (n: number) => String(n).padStart(2, "0");

  // Display in UTC to match Z-based Docker timestamps.
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function normalizeEnvironment(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function environmentLabel(value: string): string {
  const v = value.toLowerCase();
  if (v === "dev" || v === "development") return "Development";
  if (v === "uat") return "UAT";
  if (v === "prod" || v === "production") return "Production";
  return value;
}

function isProductionEnvironment(value: string): boolean {
  const v = value.toLowerCase();
  return v === "prod" || v === "production";
}

export type AppVersionProps = {
  children?: (info: AppVersionInfo) => React.ReactNode;
};

export default function AppVersion({ children }: AppVersionProps) {
  const frontendVersion = useMemo(() => bakedFrontendVersion || "unknown", []);
  const frontendBuildTime = useMemo(
    () => formatBuildTime(bakedFrontendBuildTime),
    []
  );
  const appEnvironmentRaw = useMemo(
    () => normalizeEnvironment(bakedAppEnvironment),
    []
  );

  const [backend, setBackend] = useState<VersionPayload | null>(null);

  useEffect(() => {
    let cancelled = false;

    apiFetch("/api/version")
      .then((res) => res.json() as Promise<VersionPayload>)
      .then((payload) => {
        if (cancelled) return;
        setBackend(payload);
      })
      .catch(() => {
        if (cancelled) return;
        setBackend({ name: "backend", version: "unavailable", buildTime: null });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const backendVersion = backend?.version ?? "…";
  const backendBuildTime = formatBuildTime(backend?.buildTime);
  const envLabel = environmentLabel(appEnvironmentRaw || "unknown");
  const showDetailed = !isProductionEnvironment(appEnvironmentRaw);

  const info: AppVersionInfo = {
    appVersion: frontendVersion,
    frontend: {
      version: frontendVersion,
      buildTime: frontendBuildTime,
    },
    backend: {
      version: backendVersion,
      buildTime: backendBuildTime,
    },
    environment: {
      raw: appEnvironmentRaw,
      label: envLabel,
    },
    showDetailed,
  };

  if (children) return <>{children(info)}</>;

  return <>{info.appVersion}</>;
}
