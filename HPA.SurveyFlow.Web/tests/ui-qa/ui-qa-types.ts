export type RouteStatus = 'success' | 'failed' | 'redirected' | 'requires-auth' | 'skipped' | 'timeout';
export type RouteSource = 'route-config' | 'sidebar' | 'header' | 'link' | 'manual';
export type Severity = 'critical' | 'serious' | 'moderate' | 'minor';

export interface RouteCoverageItem {
  url: string;
  label: string;
  source: RouteSource;
  requiresAuth: boolean;
  visited: boolean;
  status: RouteStatus;
  reason?: string;
  finalUrl?: string;
  title?: string;
}

export interface PageMetadata {
  url: string;
  label: string;
  title: string;
  heading: string | null;
  primaryActions: string[];
  formCount: number;
  tableCount: number;
  cardCount: number;
  emptyStateCount: number;
  modalVisible: boolean;
  loadTimeMs: number;
}

export interface ConsoleError {
  url: string;
  level: string;
  text: string;
}

export interface NetworkError {
  url: string;
  requestUrl: string;
  status: number;
  method: string;
}

export interface BrokenImage {
  url: string;
  src: string;
}

export interface ResponsiveFinding {
  url: string;
  label: string;
  breakpoint: string;
  issue: string;
  evidence?: string;
}

export interface AccessibilityFinding {
  url: string;
  breakpoint: string;
  ruleId: string;
  severity: Severity;
  description: string;
  affectedCount: number;
  exampleTarget: string;
  fix?: string;
}

export interface ConsistencyEvidence {
  url: string;
  label: string;
  pageHeaderPattern: string | null;
  hasBreadcrumb: boolean;
  primaryActionPlacement: 'top-right' | 'top-left' | 'bottom' | 'none' | 'unknown';
  primaryActionLabels: string[];
  hasDestructiveActions: boolean;
  destructiveActionStyle: string | null;
  tableDensity: 'compact' | 'standard' | 'loose' | 'none';
  tableActionLabels: string[];
  cardCount: number;
  badgeColours: string[];
  emptyStateText: string | null;
  saveButtonLocation: 'top' | 'bottom' | 'sticky' | 'none' | 'unknown';
}

export interface GlobalFinding {
  category: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedUrls: string[];
  evidence?: string;
  recommendation?: string;
}

export interface ScreenshotRecord {
  url: string;
  label: string;
  breakpoint: string;
  path: string;
  reason?: string;
}

export interface UiQaSummary {
  appName: string;
  generatedAt: string;
  baseUrl: string;
  breakpoints: string[];
  totalRoutesDiscovered: number;
  totalRoutesVisited: number;
  totalRoutesFailed: number;
  totalRoutesSkipped: number;
  routeCoverage: RouteCoverageItem[];
  pages: PageMetadata[];
  globalFindings: GlobalFinding[];
  responsiveFindings: ResponsiveFinding[];
  accessibilityFindings: AccessibilityFinding[];
  consoleErrors: ConsoleError[];
  networkErrors: NetworkError[];
  consistencyFindings: ConsistencyEvidence[];
  recommendedScreenshotsForReview: ScreenshotRecord[];
}
