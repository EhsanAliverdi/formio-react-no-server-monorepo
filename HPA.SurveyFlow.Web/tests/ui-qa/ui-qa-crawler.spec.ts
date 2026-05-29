/**
 * UI QA Crawler
 *
 * Token-aware automated UI quality assurance for the SurveyFlow Angular app.
 *
 * Run:
 *   npm run qa:ui:crawl
 *   UI_QA_USERNAME=admin@demo.local UI_QA_PASSWORD=Admin1234! npx playwright test tests/ui-qa/ui-qa-crawler.spec.ts
 *
 * Output:
 *   ui-qa-output/ui-qa-summary.json
 *   ui-qa-output/screenshots/{breakpoint}/{page}.png
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as path from 'path';
import { AxeBuilder } from '@axe-core/playwright';
import { config } from './ui-qa-config';
import {
  ensureOutputDirs,
  urlToFilename,
  waitForAngular,
  collectPageMetadata,
  collectResponsiveFindings,
  collectConsistencyEvidence,
  writeSummary,
} from './ui-qa-utils';
import type {
  UiQaSummary,
  RouteCoverageItem,
  PageMetadata,
  AccessibilityFinding,
  ConsoleError,
  NetworkError,
  ResponsiveFinding,
  ConsistencyEvidence,
  GlobalFinding,
  ScreenshotRecord,
} from './ui-qa-types';

// ── State collected across the test run ───────────────────────────────────────

const routeCoverage: RouteCoverageItem[] = [];
const pages: PageMetadata[] = [];
const consoleErrors: ConsoleError[] = [];
const networkErrors: NetworkError[] = [];
const responsiveFindings: ResponsiveFinding[] = [];
const accessibilityFindings: AccessibilityFinding[] = [];
const consistencyFindings: ConsistencyEvidence[] = [];
const screenshotsTaken: ScreenshotRecord[] = [];

let isAuthenticated = false;

// ── Helpers ───────────────────────────────────────────────────────────────────

function attachConsoleListeners(page: Page, url: string): void {
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      const text = msg.text();
      // Skip common noise
      if (/favicon|404.*\.(ico|png)|Chrome extensions|DevTools/i.test(text)) return;
      consoleErrors.push({ url, level: msg.type(), text: text.slice(0, 200) });
    }
  });
  page.on('response', response => {
    const status = response.status();
    const reqUrl = response.url();
    if (status >= 400 && !reqUrl.includes('favicon') && !reqUrl.includes('hot-update')) {
      networkErrors.push({ url, requestUrl: reqUrl.slice(0, 120), status, method: response.request().method() });
    }
  });
}

async function login(page: Page): Promise<boolean> {
  try {
    await page.goto(`${config.baseUrl}${config.adminLoginRoute}`, { timeout: config.pageTimeout });
    await waitForAngular(page);
    await page.fill('input[type="email"], input[name="email"]', config.username);
    await page.fill('input[type="password"], input[name="password"]', config.password);
    await page.click('button[type="submit"]');
    await waitForAngular(page, 8000);
    const finalUrl = page.url();
    isAuthenticated = finalUrl.includes('/admin') && !finalUrl.includes('/login');
    return isAuthenticated;
  } catch {
    return false;
  }
}

async function takeScreenshot(page: Page, label: string, breakpointName: string, reason?: string): Promise<string> {
  if (!config.screenshotsEnabled) return '';
  if (!config.mobileScreenshotsEnabled && breakpointName === 'mobile-375') return '';

  const filename = `${urlToFilename(label)}-${breakpointName}.png`;
  const screenshotPath = path.join(config.screenshotDir, breakpointName, filename);

  await page.screenshot({
    path: screenshotPath,
    fullPage: false, // viewport only — keeps file sizes manageable
    type: 'png',
  }).catch(() => {});

  return screenshotPath;
}

async function visitPageAtBreakpoints(
  context: BrowserContext,
  url: string,
  label: string,
  screenshotReasons: Map<string, string>,
): Promise<void> {
  const fullUrl = url.startsWith('http') ? url : `${config.baseUrl}${url}`;

  for (const bp of config.breakpoints) {
    const page = await context.newPage();
    attachConsoleListeners(page, url);

    try {
      await page.setViewportSize({ width: bp.width, height: bp.height });
      const startMs = Date.now();
      const response = await page.goto(fullUrl, { timeout: config.pageTimeout, waitUntil: 'domcontentloaded' });
      await waitForAngular(page);
      const loadTimeMs = Date.now() - startMs;

      const finalUrl = page.url();
      const status = response?.status() ?? 0;

      // Check if redirected to login (auth guard)
      if (finalUrl.includes('/login') && url !== '/login' && url !== '/admin/login') {
        if (bp.name === config.breakpoints[2].name) { // log once per route at desktop
          const existing = routeCoverage.find(r => r.url === url);
          if (existing) {
            existing.status = 'requires-auth';
            existing.reason = 'Redirected to login';
          }
        }
        await page.close();
        continue;
      }

      // Collect metadata (desktop only to avoid duplicates)
      if (bp.name === 'desktop-1440') {
        const meta = await collectPageMetadata(page, url, label, loadTimeMs);
        pages.push(meta);

        const consistency = await collectConsistencyEvidence(page, url, label);
        consistencyFindings.push(consistency);
      }

      // Responsive checks
      const respFindings = await collectResponsiveFindings(page, url, label, bp.name);
      responsiveFindings.push(...respFindings);

      // Accessibility (desktop only for speed — mobile a11y is usually same issues)
      if (config.axeEnabled && bp.name === 'desktop-1440') {
        try {
          const axeResults = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'best-practice'])
            .analyze();

          for (const violation of axeResults.violations) {
            accessibilityFindings.push({
              url,
              breakpoint: bp.name,
              ruleId: violation.id,
              severity: violation.impact as any,
              description: violation.description.slice(0, 150),
              affectedCount: violation.nodes.length,
              exampleTarget: violation.nodes[0]?.target?.join(' ').slice(0, 80) ?? '',
              fix: violation.helpUrl,
            });
          }
        } catch {
          // axe failure is non-fatal
        }
      }

      // Screenshot — always take at desktop-1440 and mobile-375
      const shouldScreenshot = bp.name === 'desktop-1440' || bp.name === 'mobile-375' || respFindings.length > 0;
      if (shouldScreenshot) {
        const screenshotPath = await takeScreenshot(page, label, bp.name, screenshotReasons.get(url));
        if (screenshotPath) {
          screenshotsTaken.push({ url, label, breakpoint: bp.name, path: screenshotPath });
        }
      }

    } catch (err: any) {
      const msg = err?.message ?? String(err);
      if (msg.includes('timeout') || msg.includes('Timeout')) {
        const existing = routeCoverage.find(r => r.url === url);
        if (existing) existing.status = 'timeout';
      }
    } finally {
      await page.close();
    }
  }
}

// ── Main test ─────────────────────────────────────────────────────────────────

test.describe('UI QA Crawler', () => {
  test.setTimeout(10 * 60 * 1000); // 10 minutes for full crawl

  test('crawl all routes and collect findings', async ({ browser }) => {
    ensureOutputDirs();

    // Create a persistent context so auth cookies persist across pages
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });

    // ── Step 1: Initialise route coverage from known routes ──────────────────
    for (const route of config.knownRoutes) {
      routeCoverage.push({
        url: route.url,
        label: route.label,
        source: 'manual',
        requiresAuth: route.requiresAuth,
        visited: false,
        status: 'skipped',
      });
    }

    // ── Step 2: Discover additional routes from sidebar/links ────────────────
    const discoveryPage = await context.newPage();
    try {
      await discoveryPage.goto(`${config.baseUrl}/login`, { timeout: config.pageTimeout, waitUntil: 'domcontentloaded' });
      await waitForAngular(discoveryPage);

      // Try login to discover auth-protected sidebar links
      await login(discoveryPage);

      // Collect sidebar nav links
      const sidebarLinks = await discoveryPage.evaluate((base) => {
        return Array.from(document.querySelectorAll('nav a[href], aside a[href], [class*="sidebar"] a[href]'))
          .map(el => ({
            href: (el as HTMLAnchorElement).href?.replace(base, '') || '',
            label: el.textContent?.trim().slice(0, 40) ?? '',
          }))
          .filter(l => l.href.startsWith('/') && l.href.length > 1 && !l.href.includes('#'));
      }, config.baseUrl).catch(() => [] as { href: string; label: string }[]);

      for (const link of sidebarLinks) {
        if (!routeCoverage.some(r => r.url === link.href)) {
          routeCoverage.push({
            url: link.href,
            label: link.label || link.href,
            source: 'sidebar',
            requiresAuth: true,
            visited: false,
            status: 'skipped',
          });
        }
      }
    } finally {
      await discoveryPage.close();
    }

    // ── Step 3: Visit public routes ──────────────────────────────────────────
    const screenshotReasons = new Map<string, string>();

    for (const route of routeCoverage.filter(r => !r.requiresAuth)) {
      const coverage = routeCoverage.find(r => r.url === route.url)!;
      const page = await context.newPage();

      try {
        const fullUrl = `${config.baseUrl}${route.url}`;
        const response = await page.goto(fullUrl, { timeout: config.pageTimeout, waitUntil: 'domcontentloaded' });
        await waitForAngular(page);

        coverage.visited = true;
        coverage.status = (response?.status() ?? 0) < 400 ? 'success' : 'failed';
        coverage.finalUrl = page.url();
        coverage.title = await page.title().catch(() => '');
      } catch {
        coverage.status = 'failed';
      } finally {
        await page.close();
      }
    }

    // ── Step 4: Authenticate if credentials available ─────────────────────────
    if (config.username && config.password) {
      const loginPage = await context.newPage();
      const loggedIn = await login(loginPage);
      await loginPage.close();

      if (!loggedIn) {
        for (const route of routeCoverage.filter(r => r.requiresAuth)) {
          route.status = 'requires-auth';
          route.reason = 'Login failed — check UI_QA_USERNAME / UI_QA_PASSWORD';
        }
      }
    } else {
      for (const route of routeCoverage.filter(r => r.requiresAuth)) {
        route.status = 'requires-auth';
        route.reason = 'No credentials provided (set UI_QA_USERNAME / UI_QA_PASSWORD)';
      }
    }

    // ── Step 5: Visit all reachable routes at all breakpoints ─────────────────
    const visitable = routeCoverage.filter(r =>
      !r.requiresAuth || (isAuthenticated && r.requiresAuth)
    );

    for (const route of visitable) {
      // Skip error pages after one visit (they don't need responsive testing)
      if (route.url.startsWith('/error/') || route.url === '/maintenance') {
        const coverage = routeCoverage.find(r => r.url === route.url)!;
        const page = await context.newPage();
        try {
          await page.setViewportSize({ width: 1440, height: 900 });
          const fullUrl = `${config.baseUrl}${route.url}`;
          await page.goto(fullUrl, { timeout: config.pageTimeout, waitUntil: 'domcontentloaded' });
          await waitForAngular(page);
          coverage.visited = true;
          coverage.status = 'success';
          const screenshotPath = await takeScreenshot(page, route.label, 'desktop-1440');
          if (screenshotPath) screenshotsTaken.push({ url: route.url, label: route.label, breakpoint: 'desktop-1440', path: screenshotPath });
        } catch {
          coverage.status = 'failed';
        } finally {
          await page.close();
        }
        continue;
      }

      await visitPageAtBreakpoints(context, route.url, route.label, screenshotReasons);

      const coverage = routeCoverage.find(r => r.url === route.url)!;
      coverage.visited = true;
      if (coverage.status === 'skipped') coverage.status = 'success';
    }

    await context.close();

    // ── Step 6: Analyse consistency findings ──────────────────────────────────
    const globalFindings: GlobalFinding[] = [];

    // Inconsistent destructive action styles
    const destructiveStyles = consistencyFindings
      .filter(c => c.hasDestructiveActions)
      .map(c => ({ url: c.url, style: c.destructiveActionStyle }));
    const styleGroups = new Map<string | null, string[]>();
    for (const { url, style } of destructiveStyles) {
      if (!styleGroups.has(style)) styleGroups.set(style, []);
      styleGroups.get(style)!.push(url);
    }
    if (styleGroups.size > 1) {
      globalFindings.push({
        category: 'consistency',
        severity: 'medium',
        description: `Destructive actions use ${styleGroups.size} different styles across pages`,
        affectedUrls: destructiveStyles.map(d => d.url).slice(0, 5),
        evidence: `Styles found: ${[...styleGroups.keys()].filter(Boolean).join(', ')}`,
        recommendation: 'Standardise delete/remove buttons to use border-red-200 bg-red-50 text-red-700 outline style',
      });
    }

    // Pages missing primary actions (unexpected)
    const noActions = consistencyFindings
      .filter(c => c.primaryActionPlacement === 'none' && c.tableCount > 0);
    if (noActions.length > 0) {
      globalFindings.push({
        category: 'consistency',
        severity: 'medium',
        description: `${noActions.length} page(s) with tables but no visible primary action button`,
        affectedUrls: noActions.map(c => c.url).slice(0, 5),
        recommendation: 'Ensure each list/table page has a clear create/add action',
      });
    }

    // Console errors
    const errorsByPage = new Map<string, number>();
    for (const err of consoleErrors) {
      errorsByPage.set(err.url, (errorsByPage.get(err.url) ?? 0) + 1);
    }
    if (consoleErrors.length > 0) {
      globalFindings.push({
        category: 'functional',
        severity: consoleErrors.length > 10 ? 'high' : 'medium',
        description: `${consoleErrors.length} console error(s) across ${errorsByPage.size} page(s)`,
        affectedUrls: [...errorsByPage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([url]) => url),
        evidence: consoleErrors.slice(0, 2).map(e => `${e.url}: ${e.text.slice(0, 80)}`).join(' | '),
        recommendation: 'Investigate and resolve all console errors — they may indicate broken functionality',
      });
    }

    // Network errors
    if (networkErrors.length > 0) {
      globalFindings.push({
        category: 'functional',
        severity: 'high',
        description: `${networkErrors.length} failed network request(s) detected`,
        affectedUrls: [...new Set(networkErrors.map(e => e.url))].slice(0, 5),
        evidence: networkErrors.slice(0, 2).map(e => `${e.method} ${e.requestUrl} → ${e.status}`).join(' | '),
        recommendation: 'Fix failed API calls — users may see broken data or errors',
      });
    }

    // Responsive issues
    const respByBreakpoint = new Map<string, number>();
    for (const f of responsiveFindings) {
      respByBreakpoint.set(f.breakpoint, (respByBreakpoint.get(f.breakpoint) ?? 0) + 1);
    }
    if (responsiveFindings.length > 0) {
      const worstBp = [...respByBreakpoint.entries()].sort((a, b) => b[1] - a[1])[0];
      globalFindings.push({
        category: 'responsive',
        severity: worstBp[0] === 'mobile-375' ? 'high' : 'medium',
        description: `${responsiveFindings.length} responsive issue(s) found across all breakpoints`,
        affectedUrls: [...new Set(responsiveFindings.map(f => f.url))].slice(0, 5),
        evidence: `Most issues at ${worstBp[0]} (${worstBp[1]} issues)`,
        recommendation: 'Test at mobile 375px — ensure all tables have overflow-x-auto wrappers and touch targets are ≥ 44px',
      });
    }

    // Accessibility
    const a11yBySeverity = new Map<string, number>();
    for (const f of accessibilityFindings) {
      a11yBySeverity.set(f.severity, (a11yBySeverity.get(f.severity) ?? 0) + 1);
    }
    if (accessibilityFindings.length > 0) {
      globalFindings.push({
        category: 'accessibility',
        severity: a11yBySeverity.has('critical') || a11yBySeverity.has('serious') ? 'high' : 'medium',
        description: `${accessibilityFindings.length} axe violation(s): ${[...a11yBySeverity.entries()].map(([s, c]) => `${c} ${s}`).join(', ')}`,
        affectedUrls: [...new Set(accessibilityFindings.map(f => f.url))].slice(0, 5),
        recommendation: 'Fix critical/serious axe violations first — focus on missing labels and colour contrast',
      });
    }

    // ── Step 7: Select recommended screenshots for reviewer ───────────────────
    const recommendedScreenshots: ScreenshotRecord[] = [];

    // Always include desktop-1440 of key admin pages
    const keyRoutes = ['/admin', '/admin/forms', '/admin/submissions', '/admin/users', '/admin/categories', '/admin/settings'];
    for (const keyRoute of keyRoutes) {
      const shot = screenshotsTaken.find(s => s.url === keyRoute && s.breakpoint === 'desktop-1440');
      if (shot) recommendedScreenshots.push({ ...shot, reason: 'Key admin page' });
    }

    // Include mobile screenshots of pages with responsive issues
    const mobileIssueUrls = new Set(responsiveFindings.filter(f => f.breakpoint === 'mobile-375').map(f => f.url));
    for (const url of mobileIssueUrls) {
      const shot = screenshotsTaken.find(s => s.url === url && s.breakpoint === 'mobile-375');
      if (shot) recommendedScreenshots.push({ ...shot, reason: 'Responsive issue at mobile' });
    }

    // Deduplicate
    const seen = new Set<string>();
    const dedupedRecommended = recommendedScreenshots.filter(s => {
      const key = `${s.url}:${s.breakpoint}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // ── Step 8: Write compact JSON summary ────────────────────────────────────
    const summary: UiQaSummary = {
      appName: 'SurveyFlow Admin',
      generatedAt: new Date().toISOString(),
      baseUrl: config.baseUrl,
      breakpoints: config.breakpoints.map(bp => `${bp.name} (${bp.width}x${bp.height})`),
      totalRoutesDiscovered: routeCoverage.length,
      totalRoutesVisited: routeCoverage.filter(r => r.visited).length,
      totalRoutesFailed: routeCoverage.filter(r => r.status === 'failed' || r.status === 'timeout').length,
      totalRoutesSkipped: routeCoverage.filter(r => r.status === 'skipped' || r.status === 'requires-auth').length,
      routeCoverage,
      pages,
      globalFindings,
      responsiveFindings,
      accessibilityFindings,
      consoleErrors: consoleErrors.slice(0, 50), // cap to avoid huge files
      networkErrors: networkErrors.slice(0, 30),
      consistencyFindings,
      recommendedScreenshotsForReview: dedupedRecommended,
    };

    writeSummary(summary);

    console.log('\n✅ UI QA Crawl complete');
    console.log(`📄 Summary: ui-qa-output/ui-qa-summary.json`);
    console.log(`📸 Screenshots: ui-qa-output/screenshots/`);
    console.log(`🗺  Routes discovered: ${summary.totalRoutesDiscovered}`);
    console.log(`✓  Routes visited: ${summary.totalRoutesVisited}`);
    console.log(`✗  Routes failed/skipped: ${summary.totalRoutesFailed + summary.totalRoutesSkipped}`);
    console.log(`⚠  Global findings: ${globalFindings.length}`);
    console.log(`📱 Responsive issues: ${responsiveFindings.length}`);
    console.log(`♿ Accessibility violations: ${accessibilityFindings.length}`);
    console.log('\nRun /ui-qa-reviewer to generate the full report.\n');

    // The test always passes — it is a crawler, not a pass/fail assertion test
    expect(summary.totalRoutesDiscovered).toBeGreaterThan(0);
  });
});
