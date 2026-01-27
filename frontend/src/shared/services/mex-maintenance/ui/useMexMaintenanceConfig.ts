import { useEffect, useState } from "react";
import {
  loadMexConfig,
  onMexConfigChanged,
} from "./mexMaintenanceSettings";

export const useMexMaintenanceConfig = () => {
  const [config, setConfig] = useState(loadMexConfig);

  useEffect(() => {
    const refresh = () => setConfig(loadMexConfig());
    const stopListening = onMexConfigChanged(refresh);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === "mexMaintenance.config") {
        refresh();
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      stopListening();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const isReady = Boolean(config.baseUrl?.trim());

  return { config, isReady };
};
