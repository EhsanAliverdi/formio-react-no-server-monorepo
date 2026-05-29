import { inject, Injectable } from '@angular/core';
import { Observable, of, shareReplay, catchError, map } from 'rxjs';
import { SettingsService } from './settings.service';
import { SiteSettings } from '../models';

export interface PdfDocumentOptions {
  title?: string;
  subtitle?: string;
}

interface ResolvedBranding {
  siteName: string;
  logoUrl: string | null;
  copyrightText: string;
}

@Injectable({ providedIn: 'root' })
export class PdfTemplateService {
  private settingsService = inject(SettingsService);

  private branding$: Observable<ResolvedBranding> = this.settingsService.getSiteSettings().pipe(
    map((s: SiteSettings): ResolvedBranding => ({
      siteName: s.siteName?.trim() || 'SurveyFlow',
      logoUrl: s.logoExpandedLightUrl?.trim() || s.logoExpandedDarkUrl?.trim() || null,
      copyrightText: s.copyrightText?.trim() || `© ${new Date().getFullYear()} SurveyFlow`,
    })),
    catchError((): Observable<ResolvedBranding> => of({ siteName: 'SurveyFlow', logoUrl: null, copyrightText: `© ${new Date().getFullYear()} SurveyFlow` })),
    shareReplay(1),
  );

  /** Wraps body HTML in a complete, branded PDF document. Returns an Observable<string>. */
  wrap(bodyHtml: string, opts: PdfDocumentOptions = {}): Observable<string> {
    return this.branding$.pipe(
      map((b) => buildBrandedDocument(bodyHtml, b, opts)),
    );
  }
}

function buildBrandedDocument(bodyHtml: string, b: ResolvedBranding, opts: PdfDocumentOptions): string {
  const logoHtml = b.logoUrl
    ? `<img src="${escAttr(b.logoUrl)}" alt="${escAttr(b.siteName)}" class="hdr-logo" />`
    : `<span class="hdr-site-name">${esc(b.siteName)}</span>`;

  const headerTitleHtml = opts.title
    ? `<div class="hdr-title">${esc(opts.title)}${opts.subtitle ? `<span class="hdr-subtitle"> — ${esc(opts.subtitle)}</span>` : ''}</div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${esc(opts.title ?? b.siteName)}</title>
  <style>
    /* ── Page layout ── */
    @page {
      size: A4;
      margin: 10mm 14mm 18mm 14mm;
    }

    /* ── Base ── */
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11.5px;
      line-height: 1.45;
      color: #111;
    }

    /* ── Branded header ── */
    .pdf-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0 8px 0;
      border-bottom: 2px solid #4f46e5;
      margin-bottom: 16px;
    }
    .hdr-left  { display: flex; align-items: center; gap: 10px; }
    .hdr-right { text-align: right; }
    .hdr-logo  { max-height: 36px; max-width: 140px; object-fit: contain; }
    .hdr-site-name {
      font-size: 15px;
      font-weight: 700;
      color: #4f46e5;
      letter-spacing: -0.02em;
    }
    .hdr-title {
      font-size: 13px;
      font-weight: 700;
      color: #111;
    }
    .hdr-subtitle {
      font-weight: 400;
      color: #555;
    }
    .hdr-date {
      font-size: 9.5px;
      color: #888;
      margin-top: 2px;
    }

    /* ── Branded footer (printed via fixed position hack for wkhtmltopdf / puppeteer) ── */
    .pdf-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 12mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 14mm;
      border-top: 1px solid #e5e7eb;
      font-size: 9px;
      color: #aaa;
    }

    /* ── Content root ── */
    .pdf-root { width: 100%; }

    /* ── Utility ── */
    img, table { max-width: 100%; }
    pre, code   { white-space: pre-wrap; word-break: break-word; }
    .pdf-avoid-break { page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body>

  <div class="pdf-header">
    <div class="hdr-left">
      ${logoHtml}
      ${headerTitleHtml}
    </div>
    <div class="hdr-right">
      <div class="hdr-date">Exported ${new Date().toLocaleString()}</div>
    </div>
  </div>

  <div class="pdf-root">${bodyHtml}</div>

  <div class="pdf-footer">
    <span>${esc(b.copyrightText)}</span>
    <span>Confidential</span>
  </div>

</body>
</html>`;
}

function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escAttr(v: string): string { return esc(v); }
