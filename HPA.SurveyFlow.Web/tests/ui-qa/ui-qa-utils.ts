import * as fs from 'fs';
import * as path from 'path';
import { Page } from '@playwright/test';
import type { ConsistencyEvidence, PageMetadata, ResponsiveFinding } from './ui-qa-types';
import { config } from './ui-qa-config';

/** Ensure output directories exist. */
export function ensureOutputDirs(): void {
  fs.mkdirSync(config.outputDir, { recursive: true });
  for (const bp of config.breakpoints) {
    fs.mkdirSync(path.join(config.screenshotDir, bp.name), { recursive: true });
  }
}

/** Clean a URL into a safe filename segment. */
export function urlToFilename(url: string): string {
  return url.replace(/^https?:\/\/[^/]+/, '').replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'root';
}

/** Wait for Angular to settle (no pending HTTP / router transitions). */
export async function waitForAngular(page: Page, timeout = config.networkIdleTimeout): Promise<void> {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // networkidle timeout is acceptable — page may have long-polling
  }
  // Brief extra pause for Angular change detection
  await page.waitForTimeout(300);
}

/** Collect basic page metadata without loading full DOM. */
export async function collectPageMetadata(page: Page, url: string, label: string, loadTimeMs: number): Promise<PageMetadata> {
  const title = await page.title().catch(() => '');

  const heading = await page.evaluate(() => {
    const h = document.querySelector('h1, h2.text-2xl, h2.text-xl, [class*="font-bold"][class*="text-2xl"]');
    return h ? h.textContent?.trim().slice(0, 80) ?? null : null;
  }).catch(() => null);

  const primaryActions = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button[type="button"], a[href]'))
      .filter(el => {
        const text = el.textContent?.trim() ?? '';
        const cls = (el as HTMLElement).className ?? '';
        return (cls.includes('bg-indigo') || cls.includes('bg-blue') || cls.includes('bg-green'))
          && text.length > 0 && text.length < 40;
      })
      .map(el => el.textContent?.trim() ?? '')
      .slice(0, 5);
    return [...new Set(btns)];
  }).catch(() => [] as string[]);

  const [formCount, tableCount, cardCount, emptyStateCount, modalVisible] = await page.evaluate(() => {
    return [
      document.querySelectorAll('form').length,
      document.querySelectorAll('table').length,
      document.querySelectorAll('[class*="rounded-xl"][class*="border"], [class*="rounded-2xl"][class*="shadow"]').length,
      document.querySelectorAll('[class*="text-gray-400"], [class*="text-gray-500"]')
        ? Array.from(document.querySelectorAll('*')).filter(el =>
          el.children.length === 0 && /no .+ yet|empty|no results/i.test(el.textContent ?? '')).length
        : 0,
      document.querySelectorAll('[role="dialog"], .modal, [class*="fixed inset-0"]').length > 0,
    ];
  }).catch(() => [0, 0, 0, 0, false]);

  return {
    url,
    label,
    title,
    heading,
    primaryActions,
    formCount: formCount as number,
    tableCount: tableCount as number,
    cardCount: cardCount as number,
    emptyStateCount: emptyStateCount as number,
    modalVisible: modalVisible as boolean,
    loadTimeMs,
  };
}

/** Check for responsive issues at the current viewport size. */
export async function collectResponsiveFindings(page: Page, url: string, label: string, breakpointName: string): Promise<ResponsiveFinding[]> {
  const findings: ResponsiveFinding[] = [];
  const vw = page.viewportSize()?.width ?? 1440;

  const issues = await page.evaluate((vpWidth) => {
    const results: string[] = [];
    const body = document.body;

    // Horizontal scroll
    if (body.scrollWidth > vpWidth + 5) {
      results.push(`Horizontal scroll: body.scrollWidth=${body.scrollWidth} > viewport=${vpWidth}`);
    }

    // Overflowing elements
    const overflows: string[] = [];
    document.querySelectorAll('input, select, button, table, img').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.right > vpWidth + 10 && rect.width > 0) {
        const tag = el.tagName.toLowerCase();
        const cls = (el as HTMLElement).className?.slice(0, 40) ?? '';
        overflows.push(`${tag}.${cls.split(' ')[0]}`);
      }
    });
    if (overflows.length > 0) {
      results.push(`Elements overflowing viewport: ${overflows.slice(0, 3).join(', ')}`);
    }

    // Tables without scroll containers (mobile)
    if (vpWidth < 768) {
      document.querySelectorAll('table').forEach(table => {
        const parent = table.parentElement;
        if (parent && !parent.classList.contains('overflow-x-auto') && !parent.classList.contains('overflow-auto')) {
          results.push('Table without overflow-x-auto wrapper on mobile');
        }
      });
    }

    // Small touch targets on mobile
    if (vpWidth < 768) {
      const smallBtns: string[] = [];
      document.querySelectorAll('button, a').forEach(el => {
        const rect = el.getBoundingClientRect();
        if (rect.height > 0 && rect.height < 36 && rect.width > 0) {
          smallBtns.push(`${el.tagName.toLowerCase()}:"${el.textContent?.trim().slice(0, 20)}"`);
        }
      });
      if (smallBtns.length > 2) {
        results.push(`${smallBtns.length} touch targets < 36px height: ${smallBtns.slice(0, 2).join(', ')}`);
      }
    }

    return results;
  }, vw).catch(() => [] as string[]);

  for (const issue of issues) {
    findings.push({ url, label, breakpoint: breakpointName, issue });
  }

  return findings;
}

/** Collect consistency evidence without heavy DOM work. */
export async function collectConsistencyEvidence(page: Page, url: string, label: string): Promise<ConsistencyEvidence> {
  return await page.evaluate((pageLabel) => {
    const heading = document.querySelector('h1')?.textContent?.trim().slice(0, 60) ?? null;
    const hasBreadcrumb = !!document.querySelector('[aria-label="breadcrumb"], nav ol, .breadcrumb');

    // Primary action: look for prominent coloured button in top area
    let primaryActionPlacement: ConsistencyEvidence['primaryActionPlacement'] = 'none';
    const topButtons = Array.from(document.querySelectorAll('button, a'))
      .filter(el => {
        const cls = (el as HTMLElement).className ?? '';
        return cls.includes('bg-indigo') || cls.includes('bg-blue');
      });
    if (topButtons.length > 0) {
      const rect = topButtons[0].getBoundingClientRect();
      primaryActionPlacement = rect.top < 150 ? 'top-right' : rect.top < 400 ? 'top-right' : 'bottom';
    }

    const primaryActionLabels = topButtons.slice(0, 3).map(el => el.textContent?.trim().slice(0, 30) ?? '').filter(Boolean);

    const destructiveBtns = Array.from(document.querySelectorAll('button'))
      .filter(el => /delete|remove|destroy/i.test(el.textContent ?? ''));
    const hasDestructiveActions = destructiveBtns.length > 0;
    const destructiveActionStyle = destructiveBtns[0]
      ? (destructiveBtns[0] as HTMLElement).className?.match(/bg-red|text-red|border-red/)?.[0] ?? null
      : null;

    const tables = document.querySelectorAll('table');
    let tableDensity: ConsistencyEvidence['tableDensity'] = 'none';
    if (tables.length > 0) {
      const rows = tables[0].querySelectorAll('tr');
      tableDensity = rows.length > 15 ? 'compact' : rows.length > 5 ? 'standard' : 'loose';
    }

    const tableActionLabels = Array.from(document.querySelectorAll('table td button, table td a'))
      .map(el => el.textContent?.trim().slice(0, 20) ?? '')
      .filter(Boolean)
      .slice(0, 4);

    const badges = Array.from(document.querySelectorAll('[class*="rounded-full"][class*="px-2"]'))
      .map(el => {
        const cls = (el as HTMLElement).className ?? '';
        return cls.match(/bg-\w+-\d+/)?.[0] ?? '';
      })
      .filter(Boolean);

    const emptyEl = Array.from(document.querySelectorAll('*')).find(el =>
      el.children.length === 0 && /no .+ yet|empty|no results|nothing/i.test(el.textContent ?? ''));
    const emptyStateText = emptyEl?.textContent?.trim().slice(0, 60) ?? null;

    const saveBtn = Array.from(document.querySelectorAll('button')).find(el => /save|update|submit/i.test(el.textContent ?? ''));
    let saveButtonLocation: ConsistencyEvidence['saveButtonLocation'] = 'none';
    if (saveBtn) {
      const rect = saveBtn.getBoundingClientRect();
      const cls = (saveBtn as HTMLElement).className ?? '';
      if (cls.includes('fixed') || cls.includes('sticky')) saveButtonLocation = 'sticky';
      else if (rect.top < 150) saveButtonLocation = 'top';
      else saveButtonLocation = 'bottom';
    }

    return {
      url: window.location.href,
      label: pageLabel,
      pageHeaderPattern: heading,
      hasBreadcrumb,
      primaryActionPlacement,
      primaryActionLabels,
      hasDestructiveActions,
      destructiveActionStyle,
      tableDensity,
      tableActionLabels: [...new Set(tableActionLabels)],
      cardCount: document.querySelectorAll('[class*="rounded-xl"][class*="border"]').length,
      badgeColours: [...new Set(badges)].slice(0, 6),
      emptyStateText,
      saveButtonLocation,
    } as ConsistencyEvidence;
  }, label).catch(() => ({
    url, label, pageHeaderPattern: null, hasBreadcrumb: false,
    primaryActionPlacement: 'unknown', primaryActionLabels: [],
    hasDestructiveActions: false, destructiveActionStyle: null,
    tableDensity: 'none', tableActionLabels: [], cardCount: 0,
    badgeColours: [], emptyStateText: null, saveButtonLocation: 'unknown',
  } as ConsistencyEvidence));
}

/** Write the JSON summary atomically. */
export function writeSummary(summary: object): void {
  const tmp = config.summaryFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(summary, null, 2), 'utf8');
  fs.renameSync(tmp, config.summaryFile);
}
