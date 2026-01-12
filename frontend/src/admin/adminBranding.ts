export type AdminSidebarBranding = {
  href: string;
  expandedLightSrc: string;
  expandedDarkSrc: string;
  collapsedSrc: string;
  alt: string;
  expandedWidth: number;
  expandedHeight: number;
  collapsedSize: number;
};

export const adminSidebarBranding: AdminSidebarBranding = {
  href: "/admin",
  expandedLightSrc: "/images/logo/logo.svg",
  expandedDarkSrc: "/images/logo/logo-dark.svg",
  collapsedSrc: "/images/logo/logo-icon.svg",
  alt: "Logo",
  expandedWidth: 150,
  expandedHeight: 40,
  collapsedSize: 32,
};
