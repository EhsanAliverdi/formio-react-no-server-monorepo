import { useEffect, useMemo, useState } from "react";
import type { IconType } from "react-icons";
import { getApiBaseUrl } from "../../services/apiClient";
import { parseIconKey } from "./reactIconsRegistry";

export function ReactIconFromKey({
  iconKey,
  className,
  fallback: FallbackIcon,
}: {
  iconKey?: string | null;
  className?: string;
  fallback?: IconType;
}) {
  const parsed = useMemo(() => parseIconKey(iconKey), [iconKey]);

  const [hadError, setHadError] = useState(false);

  useEffect(() => {
    setHadError(false);
  }, [parsed?.pack, parsed?.name]);

  if (!parsed || hadError) {
    const Icon = FallbackIcon ?? null;
    return Icon ? <Icon className={className} /> : null;
  }

  const base = getApiBaseUrl();
  const src = `${base}/api/icons/svg?pack=${encodeURIComponent(parsed.pack)}&name=${encodeURIComponent(parsed.name)}`;
  return (
    <img
      src={src}
      alt={parsed.name}
      className={className}
      loading="lazy"
      onError={() => setHadError(true)}
    />
  );
}
