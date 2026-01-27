import { useEffect, useMemo, useState } from "react";
import Button from "../../../../template/tailAdmin/components/ui/button/Button";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import Select from "../../../../template/tailAdmin/components/form/Select";
import Switch from "../../../../template/tailAdmin/components/form/switch/Switch";
import type { MexAuthConfig, MexConfig } from "../services/core/config";
import { defaultMexConfig, loadMexConfig, saveMexConfig } from "./mexMaintenanceSettings";

const authTypeOptions = [
  { value: "apiKey", label: "API Key" },
  { value: "basic", label: "Basic Auth" },
  { value: "bearer", label: "Bearer Token" },
];

const environmentOptions = [
  { value: "production", label: "Production" },
  { value: "uat", label: "UAT" },
  { value: "test", label: "Test" },
  { value: "development", label: "Development" },
  { value: "custom", label: "Custom" },
];

const normalizeAuth = (auth: MexAuthConfig): MexAuthConfig => {
  if (auth.type === "apiKey") {
    return {
      type: "apiKey",
      apiKey: auth.apiKey ?? "",
      headerName: auth.headerName ?? "X-API-Key",
    };
  }
  if (auth.type === "basic") {
    return {
      type: "basic",
      username: auth.username ?? "",
      password: auth.password ?? "",
    };
  }
  return {
    type: "bearer",
    token: auth.token ?? "",
  };
};

export default function MexMaintenanceSettingsForm() {
  const [config, setConfig] = useState<MexConfig>(defaultMexConfig);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setConfig(loadMexConfig());
  }, []);

  const authConfig = useMemo(() => normalizeAuth(config.auth), [config.auth]);

  const updateAuthType = (type: MexAuthConfig["type"]) => {
    if (type === "apiKey") {
      setConfig((prev) => ({
        ...prev,
        auth: { type: "apiKey", apiKey: "", headerName: "X-API-Key" },
      }));
      return;
    }
    if (type === "basic") {
      setConfig((prev) => ({
        ...prev,
        auth: { type: "basic", username: "", password: "" },
      }));
      return;
    }
    setConfig((prev) => ({
      ...prev,
      auth: { type: "bearer", token: "" },
    }));
  };

  const handleSave = () => {
    saveMexConfig(config);
    setSavedAt(new Date().toLocaleString());
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          MEX API connection
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure how SurveyFlow authenticates against the MEX Maintenance API.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mexBaseUrl">Base URL</Label>
            <Input
              id="mexBaseUrl"
              type="text"
              placeholder="https://your-mex-server:5100"
              value={config.baseUrl}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  baseUrl: e.target.value,
                }))
              }
              hint="Set the base URL for the MEX API instance."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mexEnvironment">Environment</Label>
            <Select
              id="mexEnvironment"
              options={environmentOptions}
              value={config.environment ?? "production"}
              onChange={(value) =>
                setConfig((prev) => ({
                  ...prev,
                  environment: value as MexConfig["environment"],
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mexClientName">Client name</Label>
            <Input
              id="mexClientName"
              type="text"
              placeholder="SurveyFlow Admin"
              value={config.clientName ?? ""}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  clientName: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mexTimeout">Timeout (ms)</Label>
            <Input
              id="mexTimeout"
              type="number"
              min="1000"
              placeholder="10000"
              value={config.timeoutMs ?? 10000}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  timeoutMs: Number(e.target.value),
                }))
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Authentication strategy
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choose the authentication type and supply the required credentials.
        </p>

        <div className="mt-4 max-w-sm space-y-2">
          <Label htmlFor="mexAuthType">Auth type</Label>
          <Select
            id="mexAuthType"
            options={authTypeOptions}
            value={authConfig.type}
            onChange={(value) => updateAuthType(value as MexAuthConfig["type"])}
          />
        </div>

        {authConfig.type === "apiKey" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mexApiKey">API key</Label>
              <Input
                id="mexApiKey"
                type="password"
                placeholder="Enter API key"
                value={authConfig.apiKey}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    auth: {
                      type: "apiKey",
                      apiKey: e.target.value,
                      headerName: authConfig.headerName ?? "X-API-Key",
                    },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mexApiHeader">Header name</Label>
              <Input
                id="mexApiHeader"
                type="text"
                placeholder="X-API-Key"
                value={authConfig.headerName ?? "X-API-Key"}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    auth: {
                      type: "apiKey",
                      apiKey: authConfig.apiKey,
                      headerName: e.target.value,
                    },
                  }))
                }
              />
            </div>
          </div>
        )}

        {authConfig.type === "basic" && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mexBasicUser">Username</Label>
              <Input
                id="mexBasicUser"
                type="text"
                placeholder="mex-admin"
                value={authConfig.username}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    auth: {
                      type: "basic",
                      username: e.target.value,
                      password: authConfig.password,
                    },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mexBasicPassword">Password</Label>
              <Input
                id="mexBasicPassword"
                type="password"
                placeholder="Enter password"
                value={authConfig.password}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    auth: {
                      type: "basic",
                      username: authConfig.username,
                      password: e.target.value,
                    },
                  }))
                }
              />
            </div>
          </div>
        )}

        {authConfig.type === "bearer" && (
          <div className="mt-4 max-w-lg space-y-2">
            <Label htmlFor="mexBearerToken">Bearer token</Label>
            <Input
              id="mexBearerToken"
              type="password"
              placeholder="Paste bearer token"
              value={authConfig.token}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  auth: {
                    type: "bearer",
                    token: e.target.value,
                  },
                }))
              }
            />
          </div>
        )}

      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Navigation preferences
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choose whether the SDK Help menu appears in the MEX Maintenance navigation.
        </p>
        <div className="mt-4">
          <Switch
            label="Show SDK Help menu"
            checked={config.showSdkHelp ?? true}
            onChange={(checked) =>
              setConfig((prev) => ({
                ...prev,
                showSdkHelp: checked,
              }))
            }
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Save configuration
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Persist authentication, base URL, and navigation preferences.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" onClick={handleSave}>
              Save settings
            </Button>
            {savedAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Saved {savedAt}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
