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

export function isReactIconPack(value: string): value is ReactIconPack {
  return REACT_ICON_PACKS.some((p) => p.id === value);
}

export async function importIconPack(pack: ReactIconPack): Promise<Record<string, unknown>> {
  switch (pack) {
    case "ai":
      return (await import("react-icons/ai")) as unknown as Record<string, unknown>;
    case "bi":
      return (await import("react-icons/bi")) as unknown as Record<string, unknown>;
    case "bs":
      return (await import("react-icons/bs")) as unknown as Record<string, unknown>;
    case "cg":
      return (await import("react-icons/cg")) as unknown as Record<string, unknown>;
    case "ci":
      return (await import("react-icons/ci")) as unknown as Record<string, unknown>;
    case "di":
      return (await import("react-icons/di")) as unknown as Record<string, unknown>;
    case "fa":
      return (await import("react-icons/fa")) as unknown as Record<string, unknown>;
    case "fa6":
      return (await import("react-icons/fa6")) as unknown as Record<string, unknown>;
    case "fc":
      return (await import("react-icons/fc")) as unknown as Record<string, unknown>;
    case "fi":
      return (await import("react-icons/fi")) as unknown as Record<string, unknown>;
    case "gi":
      return (await import("react-icons/gi")) as unknown as Record<string, unknown>;
    case "go":
      return (await import("react-icons/go")) as unknown as Record<string, unknown>;
    case "gr":
      return (await import("react-icons/gr")) as unknown as Record<string, unknown>;
    case "hi":
      return (await import("react-icons/hi")) as unknown as Record<string, unknown>;
    case "hi2":
      return (await import("react-icons/hi2")) as unknown as Record<string, unknown>;
    case "im":
      return (await import("react-icons/im")) as unknown as Record<string, unknown>;
    case "io":
      return (await import("react-icons/io")) as unknown as Record<string, unknown>;
    case "io5":
      return (await import("react-icons/io5")) as unknown as Record<string, unknown>;
    case "lia":
      return (await import("react-icons/lia")) as unknown as Record<string, unknown>;
    case "lu":
      return (await import("react-icons/lu")) as unknown as Record<string, unknown>;
    case "md":
      return (await import("react-icons/md")) as unknown as Record<string, unknown>;
    case "pi":
      return (await import("react-icons/pi")) as unknown as Record<string, unknown>;
    case "ri":
      return (await import("react-icons/ri")) as unknown as Record<string, unknown>;
    case "rx":
      return (await import("react-icons/rx")) as unknown as Record<string, unknown>;
    case "si":
      return (await import("react-icons/si")) as unknown as Record<string, unknown>;
    case "sl":
      return (await import("react-icons/sl")) as unknown as Record<string, unknown>;
    case "tb":
      return (await import("react-icons/tb")) as unknown as Record<string, unknown>;
    case "tfi":
      return (await import("react-icons/tfi")) as unknown as Record<string, unknown>;
    case "ti":
      return (await import("react-icons/ti")) as unknown as Record<string, unknown>;
    case "vsc":
      return (await import("react-icons/vsc")) as unknown as Record<string, unknown>;
    case "wi":
      return (await import("react-icons/wi")) as unknown as Record<string, unknown>;
    default:
      return {};
  }
}
