import * as path from 'path';

export interface Breakpoint {
  name: string;
  width: number;
  height: number;
}

export interface KnownRoute {
  url: string;
  label: string;
  requiresAuth: boolean;
  requiresRole?: string;
}

export interface UiQaConfig {
  baseUrl: string;
  username: string;
  password: string;
  adminLoginRoute: string;
  outputDir: string;
  screenshotDir: string;
  summaryFile: string;
  breakpoints: Breakpoint[];
  knownRoutes: KnownRoute[];
  axeEnabled: boolean;
  screenshotsEnabled: boolean;
  mobileScreenshotsEnabled: boolean;
  networkIdleTimeout: number;
  pageTimeout: number;
}

export const config: UiQaConfig = {
  baseUrl: process.env['UI_QA_BASE_URL'] || 'http://localhost:4200',
  username: process.env['UI_QA_USERNAME'] || 'admin@demo.local',
  password: process.env['UI_QA_PASSWORD'] || 'Admin1234!',
  adminLoginRoute: '/admin/login',
  outputDir: path.resolve(__dirname, '../../..', 'ui-qa-output'),
  screenshotDir: path.resolve(__dirname, '../../..', 'ui-qa-output', 'screenshots'),
  summaryFile: path.resolve(__dirname, '../../..', 'ui-qa-output', 'ui-qa-summary.json'),
  breakpoints: [
    { name: 'mobile-375', width: 375, height: 812 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1024', width: 1024, height: 768 },
    { name: 'desktop-1440', width: 1440, height: 900 },
  ],
  knownRoutes: [
    // Public routes
    { url: '/login', label: 'Login', requiresAuth: false },
    { url: '/admin/login', label: 'Admin Login', requiresAuth: false },
    { url: '/maintenance', label: 'Maintenance', requiresAuth: false },
    { url: '/error/403', label: 'Error 403', requiresAuth: false },
    { url: '/error/500', label: 'Error 500', requiresAuth: false },
    { url: '/error/offline', label: 'Error Offline', requiresAuth: false },
    // Admin routes
    { url: '/admin', label: 'Admin Overview', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/forms', label: 'Admin Forms', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/categories', label: 'Admin Categories', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/submissions', label: 'Admin Submissions', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/reports', label: 'Admin Reports', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/datasets', label: 'Admin Datasets', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/users', label: 'Admin Users', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/jobs', label: 'Admin Jobs', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/synced-data', label: 'Admin Synced Data', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/logs', label: 'Admin Logs', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/audit-log', label: 'Admin Audit Log', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/api-keys', label: 'Admin API Keys', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/integrations', label: 'Admin Integrations', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/settings', label: 'Admin Settings', requiresAuth: true, requiresRole: 'admin' },
    { url: '/admin/profile', label: 'Admin Profile', requiresAuth: true, requiresRole: 'admin' },
    // Public app routes
    { url: '/', label: 'Public Home', requiresAuth: false },
    { url: '/category/pre-start', label: 'Category Pre-Start', requiresAuth: false },
  ],
  axeEnabled: process.env['UI_QA_AXE_ENABLED'] !== 'false',
  screenshotsEnabled: process.env['UI_QA_SCREENSHOTS_ENABLED'] !== 'false',
  mobileScreenshotsEnabled: process.env['UI_QA_MOBILE_SCREENSHOTS'] !== 'false',
  networkIdleTimeout: 5000,
  pageTimeout: 20000,
};
