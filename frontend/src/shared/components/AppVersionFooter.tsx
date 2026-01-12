import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../services/apiClient";
import {
  appEnvironment as bakedAppEnvironment,
  appVersion as bakedFrontendVersion,
  buildTime as bakedFrontendBuildTime,
} from "../../generated/buildInfo";

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

export default function AppVersionFooter() {
  const frontendVersion = useMemo(() => bakedFrontendVersion || "unknown", []);
  const frontendBuildTime = useMemo(() => formatBuildTime(bakedFrontendBuildTime), []);
  const appEnvironment = useMemo(() => normalizeEnvironment(bakedAppEnvironment), []);
  const showDetailed = useMemo(() => !isProductionEnvironment(appEnvironment), [appEnvironment]);

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
  const envLabel = environmentLabel(appEnvironment || "unknown");

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
      <div className="flex flex-col gap-1">
        {showDetailed && (
          <>
            <div>
              <span className="font-medium">Frontend:</span> {frontendVersion}
              <span> ({frontendBuildTime})</span>
            </div>
            <div>
              <span className="font-medium">Backend:</span> {backendVersion}
              <span> ({backendBuildTime})</span>
            </div>
          </>
        )}

        <div>
          <span className="font-medium">App Version :</span> {frontendVersion}
        </div>

        {showDetailed && (
          <div>
            <span className="font-medium">environment</span> {envLabel}
          </div>
        )}
      </div>
    </div>
  );
}
