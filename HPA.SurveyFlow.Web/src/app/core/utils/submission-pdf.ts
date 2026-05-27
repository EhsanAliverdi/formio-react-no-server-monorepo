// Ported from FormioPdfExport.tsx — builds a print-ready HTML body for a submission.

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

function isProbablyImageUrl(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (/^data:image\//i.test(v)) return true;
  try {
    const u = new URL(v);
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(u.pathname.toLowerCase());
  } catch {
    return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(v.toLowerCase());
  }
}

type FileLike = { url?: unknown; originalName?: unknown; name?: unknown };

function asFileLike(value: unknown): FileLike | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  if (typeof r['url'] === 'string' && (r['url'] as string).trim()) return r as FileLike;
  return null;
}

function renderImagesHtml(files: FileLike[]): string {
  const imgs = files
    .map(f => {
      const src = typeof f.url === 'string' ? f.url : '';
      if (!src) return '';
      const alt = (typeof f.originalName === 'string' && f.originalName.trim())
        ? f.originalName.trim()
        : (typeof f.name === 'string' ? f.name : 'Image');
      return `<a href="${escapeAttr(src)}" target="_blank" rel="noopener noreferrer"><img class="pdf-img" src="${escapeAttr(src)}" alt="${escapeAttr(alt || 'Image')}" /></a>`;
    })
    .filter(Boolean)
    .join('');
  return imgs ? `<div class="pdf-img-list">${imgs}</div>` : '';
}

function formatWhen(value: unknown): string {
  if (typeof value !== 'string') return '';
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return value;
  return new Date(t).toLocaleString();
}

function formatAnswerForPdfHtml(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') {
    return isProbablyImageUrl(value)
      ? renderImagesHtml([{ url: value, originalName: 'Image' }])
      : escapeHtml(value);
  }
  if (typeof value === 'number') return escapeHtml(String(value));
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    const fileLikes = value.map(asFileLike).filter((x): x is FileLike => x !== null);
    if (fileLikes.length === value.length && fileLikes.length > 0) return renderImagesHtml(fileLikes);
    return value.map(formatAnswerForPdfHtml).filter(x => x?.trim()).join(', ');
  }
  if (typeof value === 'object') {
    const file = asFileLike(value);
    if (file && typeof file.url === 'string') return renderImagesHtml([file]);
    const rec = value as Record<string, unknown>;
    if (typeof rec['label'] === 'string' && (rec['label'] as string).trim()) return escapeHtml((rec['label'] as string).trim());
    if ('value' in rec) return formatAnswerForPdfHtml(rec['value']);
    try { return escapeHtml(JSON.stringify(value)); } catch { return escapeHtml(String(value)); }
  }
  return escapeHtml(String(value));
}

type PdfField = { key: string; label: string };

function getByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const o = obj as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(o, path)) return o[path];
  if (!path.includes('.')) return o[path];
  let cur: unknown = o;
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function collectPdfFields(form: unknown): PdfField[] {
  if (!form || typeof form !== 'object') return [];
  const out: PdfField[] = [];
  const seen = new Set<string>();

  const push = (key: unknown, label: unknown) => {
    if (typeof key !== 'string' || !key.trim() || seen.has(key)) return;
    seen.add(key);
    out.push({ key, label: (typeof label === 'string' && label.trim()) ? label.trim() : key });
  };

  const walk = (node: unknown) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    const type = typeof n['type'] === 'string' ? n['type'] : '';
    if (n['key'] && n['input'] !== false && type !== 'button' && type !== 'hidden' && type !== 'htmlelement' && type !== 'content') {
      push(n['key'], n['label']);
    }
    if (Array.isArray(n['components'])) walk(n['components']);
    if (Array.isArray(n['columns'])) (n['columns'] as any[]).forEach(col => Array.isArray(col?.components) && walk(col.components));
    if (Array.isArray(n['rows'])) (n['rows'] as any[]).forEach(row => Array.isArray(row) ? row.forEach(cell => Array.isArray(cell?.components) && walk(cell.components)) : walk(row));
  };

  walk((form as Record<string, unknown>)['components']);
  return out;
}

function formatNormalAnswer(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec['label'] === 'string' && (rec['label'] as string).trim()) return (rec['label'] as string).trim();
    if ('value' in rec) return formatNormalAnswer(rec['value']);
  }
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(formatNormalAnswer).filter(Boolean).join(', ');
  try { return JSON.stringify(value); } catch { return String(value); }
}

export function buildSubmissionPdfBody(detail: Record<string, unknown>): string {
  const formName = typeof detail['form_name'] === 'string' ? detail['form_name'] : 'Submission';
  const id = detail['id'] != null ? String(detail['id']) : '';
  const submittedAt = formatWhen(detail['submitted_at']);
  const submittedBy = (typeof detail['user_email'] === 'string' && detail['user_email'].trim()) ? detail['user_email'] : 'Anonymous';
  const updatedAt = detail['updated_at'] ? formatWhen(detail['updated_at']) : '—';
  const updatedBy = (typeof detail['updated_by_email'] === 'string' && detail['updated_by_email'].trim()) ? detail['updated_by_email'] : '—';
  const abnormalities: unknown[] = Array.isArray(detail['abnormalities']) ? detail['abnormalities'] : [];

  const fields = collectPdfFields(detail['form']);
  const rawData = (detail['data'] && typeof detail['data'] === 'object') ? detail['data'] as Record<string, unknown> : {};
  let dataObj = rawData;
  if (fields.length > 0 && rawData['data'] && typeof rawData['data'] === 'object') {
    const nested = rawData['data'] as Record<string, unknown>;
    const keys = fields.map(f => f.key);
    const hasAtRoot = keys.some(k => Object.prototype.hasOwnProperty.call(rawData, k));
    const hasInNested = keys.some(k => Object.prototype.hasOwnProperty.call(nested, k));
    if (!hasAtRoot && hasInNested) dataObj = nested;
  }

  const rows = fields
    .map(f => ({ label: f.label, valueHtml: (formatAnswerForPdfHtml(getByPath(dataObj, f.key)).trim()) || '—' }))
    .filter(r => r.label.trim());

  const abnormalHtml = abnormalities.length ? `
    <h2>Abnormal answers</h2>
    <div class="box pdf-avoid-break">
      <ul class="list">
        ${abnormalities.map(a => {
          if (!a || typeof a !== 'object') return '';
          const rec = a as Record<string, unknown>;
          const key = typeof rec['key'] === 'string' ? rec['key'] : '';
          const label = typeof rec['label'] === 'string' ? rec['label'] : '';
          const question = (label.trim() || key).trim();
          const level = typeof rec['level'] === 'string' ? rec['level'] : 'error';
          const normal = formatNormalAnswer(rec['normalValue'] ?? rec['normal_value']);
          const color = level === 'warning' ? '#b45309' : '#b91c1c';
          return `<li style="color:${color}"><strong>${escapeHtml(question)}</strong> <span style="font-size:11px;font-weight:600">(${escapeHtml(level)})</span>${normal ? `<div style="color:#555;font-size:11px">Normal: ${escapeHtml(normal)}</div>` : ''}</li>`;
        }).join('')}
      </ul>
    </div>` : '';

  return `
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 12px; line-height: 1.35; color: #111; }
  h1 { font-size: 16px; margin: 0 0 8px 0; }
  h2 { font-size: 13px; margin: 16px 0 8px 0; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  .meta .k { font-size: 11px; color: #555; }
  .meta .v { font-size: 12px; }
  .box { border: 1px solid #ddd; border-radius: 6px; padding: 10px; }
  .qa-wrap { margin-top: 14px; padding: 10px; }
  .qa-item { padding: 8px 0; }
  .q { font-weight: 700; font-size: 13.5px; }
  .a { margin-top: 2px; color: #555; white-space: pre-wrap; overflow-wrap: anywhere; word-break: break-word; }
  .pdf-img-list { display: flex; flex-wrap: wrap; gap: 8px; }
  .pdf-img { display: block; max-width: 260px; max-height: 260px; object-fit: contain; border: 1px solid #e3e3e3; border-radius: 6px; }
  .muted { color: #666; font-size: 11px; }
  .list { margin: 0; padding-left: 18px; }
</style>
<div>
  <h1>${escapeHtml(formName)}${id ? ` — Submission #${escapeHtml(id)}` : ''}</h1>
  <div class="box pdf-avoid-break">
    <div class="meta">
      <div><div class="k">Submitted</div><div class="v">${escapeHtml(submittedAt || '—')}</div></div>
      <div><div class="k">Submitted by</div><div class="v">${escapeHtml(submittedBy)}</div></div>
      <div><div class="k">Last updated</div><div class="v">${escapeHtml(updatedAt)}</div></div>
      <div><div class="k">Last updated by</div><div class="v">${escapeHtml(updatedBy)}</div></div>
    </div>
  </div>
  ${abnormalHtml}
  <div class="qa-wrap">
    ${rows.map(r => `<div class="qa-item"><div class="q">${escapeHtml(r.label)}</div><div class="a">${r.valueHtml}</div></div>`).join('')}
    ${rows.length === 0 ? '<div class="muted">No fields found in schema.</div>' : ''}
  </div>
</div>`;
}

export function wrapPdfDocument(bodyHtml: string): string {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Export</title>
  <style>
    @page { size: A4; margin: 12mm; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .pdf-root { width: 100%; box-sizing: border-box; }
    img, table { max-width: 100%; }
    pre, code { white-space: pre-wrap; word-break: break-word; }
    .pdf-avoid-break { page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body><div class="pdf-root">${bodyHtml}</div></body>
</html>`;
}
