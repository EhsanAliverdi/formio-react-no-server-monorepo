import type { MexAuthConfig, MexConfig } from "../core/config";
import type { MexEnvironment } from "../core/config/MexEnvironment";

const STORAGE_KEY = "mexMaintenance.config";
const CONFIG_EVENT = "mex-maintenance-config-changed";

const defaultAuthConfig: MexAuthConfig = {
  type: "apiKey",
  apiKey: "",
  headerName: "X-API-Key",
};

export const defaultMexConfig: MexConfig = {
  baseUrl: "",
  environment: "production",
  auth: defaultAuthConfig,
  timeoutMs: 10000,
  clientName: "SurveyFlow Admin",
};

const isValidEnvironment = (value: unknown): value is MexEnvironment =>
  value === "production" ||
  value === "uat" ||
  value === "test" ||
  value === "development" ||
  value === "custom";

const isValidAuthConfig = (value: unknown): value is MexAuthConfig => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as MexAuthConfig;
  if (candidate.type === "apiKey") return typeof candidate.apiKey === "string";
  if (candidate.type === "basic") {
    return (
      typeof (candidate as MexAuthConfig & { username?: string }).username === "string" &&
      typeof (candidate as MexAuthConfig & { password?: string }).password === "string"
    );
  }
  if (candidate.type === "bearer") return typeof candidate.token === "string";
  return false;
};

export const loadMexConfig = (): MexConfig => {
  if (typeof window === "undefined") return defaultMexConfig;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return defaultMexConfig;

  try {
    const parsed = JSON.parse(raw) as Partial<MexConfig>;
    const auth = isValidAuthConfig(parsed.auth) ? parsed.auth : defaultAuthConfig;
    return {
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
      environment: isValidEnvironment(parsed.environment) ? parsed.environment : "production",
      auth,
      timeoutMs: typeof parsed.timeoutMs === "number" ? parsed.timeoutMs : 10000,
      clientName: typeof parsed.clientName === "string" ? parsed.clientName : "SurveyFlow Admin",
    };
  } catch {
    return defaultMexConfig;
  }
};

export const saveMexConfig = (config: MexConfig) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event(CONFIG_EVENT));
};

export const onMexConfigChanged = (handler: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CONFIG_EVENT, handler);
  return () => window.removeEventListener(CONFIG_EVENT, handler);
};
