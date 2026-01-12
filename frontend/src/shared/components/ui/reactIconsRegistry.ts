export const REACT_ICON_PACKS = [
  { id: "ai", label: "Ant Design" },
  { id: "bi", label: "BoxIcons" },
  { id: "bs", label: "Bootstrap" },
  { id: "cg", label: "css.gg" },
  { id: "ci", label: "Circum" },
  { id: "di", label: "Devicons" },
  { id: "fa", label: "Font Awesome" },
  { id: "fa6", label: "Font Awesome 6" },
  { id: "fc", label: "Flat Color" },
  { id: "fi", label: "Feather" },
  { id: "gi", label: "Game Icons" },
  { id: "go", label: "GitHub Octicons" },
  { id: "gr", label: "Grommet" },
  { id: "hi", label: "Heroicons" },
  { id: "hi2", label: "Heroicons 2" },
  { id: "im", label: "IcoMoon" },
  { id: "io", label: "Ionicons 4" },
  { id: "io5", label: "Ionicons 5" },
  { id: "lia", label: "Line Awesome" },
  { id: "lu", label: "Lucide" },
  { id: "md", label: "Material Design" },
  { id: "pi", label: "Phosphor" },
  { id: "ri", label: "Remix" },
  { id: "rx", label: "Radix" },
  { id: "si", label: "Simple Icons" },
  { id: "sl", label: "Simple Line" },
  { id: "tb", label: "Tabler" },
  { id: "tfi", label: "Themify" },
  { id: "ti", label: "Typicons" },
  { id: "vsc", label: "VS Code" },
  { id: "wi", label: "Weather" },
] as const;

export type ReactIconPack = (typeof REACT_ICON_PACKS)[number]["id"];

export type SelectedReactIcon = {
  pack: ReactIconPack;
  name: string;
};

const PACK_BY_ID = Object.fromEntries(REACT_ICON_PACKS.map((p) => [p.id, p])) as Record<ReactIconPack, (typeof REACT_ICON_PACKS)[number]>;

export function isReactIconPack(value: string): value is ReactIconPack {
  return Object.prototype.hasOwnProperty.call(PACK_BY_ID, value);
}

export function getReactIconPackLabel(pack: ReactIconPack): string {
  return PACK_BY_ID[pack]?.label ?? pack;
}

export function toIconKey(icon: SelectedReactIcon): string {
  return `${icon.pack}:${icon.name}`;
}

export function parseIconKey(key: string | undefined | null): SelectedReactIcon | null {
  if (!key || typeof key !== "string") return null;
  const raw = key.trim();
  const m = raw.match(/^([a-z0-9]+):([A-Za-z0-9_]+)$/);
  if (!m) return null;

  const packRaw = (m[1] || "").trim();
  const name = (m[2] || "").trim();
  if (!name) return null;
  if (!isReactIconPack(packRaw)) return null;

  return { pack: packRaw, name };
}
