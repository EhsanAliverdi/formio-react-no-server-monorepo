export interface FormPdfOptions {
  showConditions: boolean;
  showAbnormalities: boolean;
  showValidation: boolean;
  showKeys: boolean;
  groupBySteps: boolean;
}

const SKIP_TYPES = new Set(['button', 'hidden', 'htmlelement', 'content']);
const CONTAINER_TYPES = new Set(['panel', 'columns', 'column', 'fieldset', 'well', 'tabs', 'datagrid', 'editgrid']);

const TYPE_LABELS: Record<string, string> = {
  textfield: 'Text', textarea: 'Text area', number: 'Number', password: 'Password',
  email: 'Email', url: 'URL', phoneNumber: 'Phone', address: 'Address',
  datetime: 'Date/Time', day: 'Day', time: 'Time',
  checkbox: 'Checkbox', radio: 'Radio', select: 'Select', selectboxes: 'Select boxes',
  survey: 'Survey', signature: 'Signature', file: 'File upload',
  currency: 'Currency', tags: 'Tags',
  datagrid: 'Data grid', editgrid: 'Edit grid',
};

function escHtml(v: string): string {
  return v
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function typeBadge(type: string): string {
  const label = TYPE_LABELS[type] ?? type;
  return `<span class="badge badge-type">${escHtml(label)}</span>`;
}

function keyBadge(key: string): string {
  return `<span class="badge badge-key">${escHtml(key)}</span>`;
}

function readValues(comp: any): Array<{ label: string; value: string }> {
  const arr = comp?.values ?? comp?.data?.values ?? [];
  if (!Array.isArray(arr)) return [];
  return arr.map((v: any) => ({ label: String(v?.label ?? v?.value ?? ''), value: String(v?.value ?? '') }));
}

function dataSrcBadge(comp: any): string {
  const src = comp?.dataSrc ?? comp?.data?.dataSrc;
  if (!src || src === 'values') return '';
  const labels: Record<string, string> = {
    url: 'Dynamic — external URL',
    resource: 'Dynamic — linked resource',
    custom: 'Dynamic — custom data',
    indexeddb: 'Dynamic — indexed DB',
  };
  const label = labels[src] ?? `Dynamic — ${src}`;
  return `<span class="badge badge-dynamic">&#8635; ${escHtml(label)}</span>`;
}

function readAbnormalities(comp: any): { normalValues: string[]; warningValues: string[]; errorValues: string[]; defaultLevel: string } | null {
  const props = comp?.properties;
  if (!props) return null;
  const enabled = props.abnormal_enabled === true || props.abnormal_enabled === 'true';
  if (!enabled) return null;

  const readArr = (key: string): string[] => {
    const raw = props[key];
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => {
      const v = typeof item === 'object' && item !== null && 'value' in item ? item.value : item;
      return String(v ?? '');
    }).filter(Boolean);
  };

  return {
    normalValues: readArr('abnormal_normal_values'),
    warningValues: readArr('abnormal_warning_values'),
    errorValues: readArr('abnormal_error_values'),
    defaultLevel: props.abnormal_default_level || props.abnormal_level || 'none',
  };
}

function renderAbnormalities(comp: any, values: Array<{ label: string; value: string }>): string {
  const abn = readAbnormalities(comp);
  if (!abn) return '';

  const valMap = new Map(values.map(v => [v.value, v.label]));
  const display = (v: string) => escHtml(valMap.get(v) ? `${valMap.get(v)} (${v})` : v);

  const rows: string[] = [];
  if (abn.normalValues.length) {
    rows.push(`<div class="abn-row abn-normal"><span class="abn-badge abn-badge-normal">Normal</span>${abn.normalValues.map(display).join(', ')}</div>`);
  }
  if (abn.warningValues.length) {
    rows.push(`<div class="abn-row abn-warning"><span class="abn-badge abn-badge-warning">Warning</span>${abn.warningValues.map(display).join(', ')}</div>`);
  }
  if (abn.errorValues.length) {
    rows.push(`<div class="abn-row abn-error"><span class="abn-badge abn-badge-error">Error</span>${abn.errorValues.map(display).join(', ')}</div>`);
  }
  if (abn.defaultLevel && abn.defaultLevel !== 'none') {
    const cls = abn.defaultLevel === 'error' ? 'abn-error' : 'abn-warning';
    const label = abn.defaultLevel === 'error' ? 'Error' : 'Warning';
    rows.push(`<div class="abn-row ${cls}"><span class="abn-badge abn-badge-${abn.defaultLevel}">Default</span>All other values → ${label}</div>`);
  }

  if (!rows.length) return '';
  return `<div class="abn-section">${rows.join('')}</div>`;
}

function renderCondition(comp: any): string {
  const cond = comp?.conditional;
  if (cond?.when && cond?.eq !== undefined && cond?.eq !== '') {
    return `<div class="cond-row"><span class="badge badge-cond">Condition</span>Show when <strong>${escHtml(String(cond.when))}</strong> = <strong>${escHtml(String(cond.eq))}</strong></div>`;
  }
  if (comp?.customConditional && typeof comp.customConditional === 'string' && comp.customConditional.trim()) {
    return `<div class="cond-row"><span class="badge badge-cond">Condition</span><code class="cond-code">${escHtml(comp.customConditional.trim())}</code></div>`;
  }
  return '';
}

function renderValidation(comp: any): string {
  const v = comp?.validate;
  if (!v) return '';
  const parts: string[] = [];
  if (v.required) parts.push('<span class="badge badge-val">Required</span>');
  if (v.minLength != null && v.minLength !== '') parts.push(`<span class="badge badge-val">Min length: ${escHtml(String(v.minLength))}</span>`);
  if (v.maxLength != null && v.maxLength !== '') parts.push(`<span class="badge badge-val">Max length: ${escHtml(String(v.maxLength))}</span>`);
  if (v.min != null && v.min !== '') parts.push(`<span class="badge badge-val">Min: ${escHtml(String(v.min))}</span>`);
  if (v.max != null && v.max !== '') parts.push(`<span class="badge badge-val">Max: ${escHtml(String(v.max))}</span>`);
  if (v.pattern && typeof v.pattern === 'string' && v.pattern.trim()) parts.push(`<span class="badge badge-val">Pattern: <code>${escHtml(v.pattern.trim())}</code></span>`);
  if (!parts.length) return '';
  return `<div class="val-row">${parts.join(' ')}</div>`;
}

function renderField(comp: any, opts: FormPdfOptions, depth = 0): string {
  const label = (comp.label && String(comp.label).trim()) ? escHtml(comp.label.trim()) : escHtml(comp.key ?? '');
  const type = comp.type ?? 'unknown';
  const values = readValues(comp);
  const desc = (comp.description && String(comp.description).trim()) ? escHtml(comp.description.trim()) : '';
  const placeholder = (comp.placeholder && String(comp.placeholder).trim()) ? escHtml(comp.placeholder.trim()) : '';
  const dynBadge = dataSrcBadge(comp);
  const indentClass = depth > 0 ? ' field-card-indented' : '';

  let html = `<div class="field-card pdf-avoid-break${indentClass}">`;
  html += `<div class="field-header"><span class="field-label">${label}</span>${typeBadge(type)}${dynBadge}${opts.showKeys && comp.key ? keyBadge(comp.key) : ''}</div>`;

  if (desc) html += `<div class="field-desc">${desc}</div>`;
  if (placeholder && !desc) html += `<div class="field-desc muted">Placeholder: ${placeholder}</div>`;

  if (dynBadge && values.length === 0) {
    html += `<div class="dynamic-note">Options are loaded at runtime from an external data source and are not available at design time.</div>`;
  }

  if (values.length > 0) {
    html += `<div class="options-list">`;
    if (opts.showAbnormalities) {
      const abnRules = readAbnormalities(comp);
      if (abnRules) {
        const normalSet = new Set(abnRules.normalValues);
        const warningSet = new Set(abnRules.warningValues);
        const errorSet = new Set(abnRules.errorValues);
        html += values.map(v => {
          let cls = '';
          let indicator = '';
          if (errorSet.has(v.value)) { cls = 'opt-error'; indicator = '<span class="opt-dot dot-error"></span>'; }
          else if (warningSet.has(v.value)) { cls = 'opt-warning'; indicator = '<span class="opt-dot dot-warning"></span>'; }
          else if (normalSet.has(v.value)) { cls = 'opt-normal'; indicator = '<span class="opt-dot dot-normal"></span>'; }
          else if (abnRules.defaultLevel === 'error') { cls = 'opt-error'; indicator = '<span class="opt-dot dot-error"></span>'; }
          else if (abnRules.defaultLevel === 'warning') { cls = 'opt-warning'; indicator = '<span class="opt-dot dot-warning"></span>'; }
          return `<div class="opt-item ${cls}">${indicator}<span class="opt-label">${escHtml(v.label || v.value)}</span><span class="opt-val muted">${escHtml(v.value)}</span></div>`;
        }).join('');
      } else {
        html += values.map(v => `<div class="opt-item"><span class="opt-label">${escHtml(v.label || v.value)}</span><span class="opt-val muted">${escHtml(v.value)}</span></div>`).join('');
      }
    } else {
      html += values.map(v => `<div class="opt-item"><span class="opt-label">${escHtml(v.label || v.value)}</span><span class="opt-val muted">${escHtml(v.value)}</span></div>`).join('');
    }
    html += `</div>`;

    if (opts.showAbnormalities) {
      html += renderAbnormalities(comp, values);
    }
  } else if (opts.showAbnormalities) {
    html += renderAbnormalities(comp, []);
  }

  if (opts.showConditions) html += renderCondition(comp);
  if (opts.showValidation) html += renderValidation(comp);

  html += `</div>`;
  return html;
}

type FieldEntry = { type: 'field'; comp: any; depth: number } | { type: 'section'; title: string; index: number };

function collectEntries(schema: any, opts: FormPdfOptions): FieldEntry[] {
  const panels = (Array.isArray(schema?.components) ? schema.components : []).filter((c: any) => c?.type === 'panel');
  const isWizard = schema?.display === 'wizard' || panels.length > 0;

  const entries: FieldEntry[] = [];

  const walkComponents = (comps: any[], depth: number) => {
    if (!Array.isArray(comps)) return;
    for (const c of comps) {
      if (!c || typeof c !== 'object') continue;
      const type = c.type ?? '';
      if (SKIP_TYPES.has(type)) continue;

      if (type === 'columns') {
        for (const col of c.columns ?? []) walkComponents(col?.components ?? [], depth);
        continue;
      }
      if (CONTAINER_TYPES.has(type)) {
        walkComponents(c.components ?? [], depth + 1);
        continue;
      }
      if (c.key && c.input !== false) {
        entries.push({ type: 'field', comp: c, depth });
      }
    }
  };

  if (isWizard && opts.groupBySteps && panels.length > 0) {
    panels.forEach((panel: any, i: number) => {
      const title = panel.breadcrumb || panel.title || panel.label || panel.key || `Step ${i + 1}`;
      entries.push({ type: 'section', title, index: i });
      walkComponents(panel.components ?? [], 1);
    });
    const nonPanelComps = (schema.components ?? []).filter((c: any) => c?.type !== 'panel');
    walkComponents(nonPanelComps, 0);
  } else {
    walkComponents(schema?.components ?? [], 0);
  }

  return entries;
}

function buildStyles(): string {
  return `
<style>
  @page { size: A4; margin: 14mm 14mm 20mm 14mm; @bottom-center { content: "Page " counter(page) " of " counter(pages); font-family: system-ui, Arial, sans-serif; font-size: 9px; color: #888; } }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; font-size: 11.5px; line-height: 1.4; color: #111; }
  h1 { font-size: 17px; margin: 0 0 4px 0; }
  .subtitle { font-size: 11px; color: #666; margin: 0 0 16px 0; }
  .section-header { margin: 18px 0 8px 0; padding: 6px 10px; background: #eef2ff; border-left: 4px solid #4f46e5; border-radius: 4px; }
  .section-header h2 { font-size: 12px; font-weight: 700; color: #3730a3; margin: 0; }
  .section-header .step-num { font-size: 10px; color: #6366f1; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 2px; }
  .field-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; margin-bottom: 7px; background: #fff; }
  .field-card-indented { margin-left: 16px; border-left: 3px solid #c7d2fe; border-radius: 0 6px 6px 0; }
  .field-header { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }
  .field-label { font-weight: 700; font-size: 12.5px; flex: 1; min-width: 0; }
  .field-desc { font-size: 10.5px; color: #555; margin-top: 3px; }
  .dynamic-note { margin-top: 4px; font-size: 10px; color: #6d28d9; font-style: italic; }
  .muted { color: #888; font-size: 10px; }
  .badge { display: inline-block; border-radius: 4px; padding: 1px 6px; font-size: 9.5px; font-weight: 600; white-space: nowrap; }
  .badge-type { background: #f3f4f6; color: #374151; }
  .badge-key { background: #f0fdf4; color: #166534; font-family: monospace; font-size: 9px; }
  .badge-cond { background: #dbeafe; color: #1d4ed8; }
  .badge-val { background: #f3f4f6; color: #374151; }
  .badge-dynamic { background: #ede9fe; color: #6d28d9; }
  .options-list { margin-top: 5px; display: flex; flex-direction: column; gap: 2px; }
  .opt-item { display: flex; align-items: center; gap: 5px; padding: 2px 4px; border-radius: 3px; font-size: 10.5px; }
  .opt-normal { background: #f0fdf4; }
  .opt-warning { background: #fffbeb; }
  .opt-error { background: #fef2f2; }
  .opt-label { flex: 1; }
  .opt-val { font-family: monospace; font-size: 9px; }
  .opt-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .dot-normal { background: #16a34a; }
  .dot-warning { background: #d97706; }
  .dot-error { background: #dc2626; }
  .abn-section { margin-top: 5px; border-top: 1px solid #f0f0f0; padding-top: 4px; display: flex; flex-direction: column; gap: 2px; }
  .abn-row { display: flex; align-items: flex-start; gap: 5px; font-size: 10.5px; padding: 2px 4px; border-radius: 3px; }
  .abn-normal { background: #f0fdf4; color: #166534; }
  .abn-warning { background: #fffbeb; color: #92400e; }
  .abn-error { background: #fef2f2; color: #991b1b; }
  .abn-badge { display: inline-block; border-radius: 4px; padding: 0px 5px; font-size: 9px; font-weight: 700; white-space: nowrap; margin-right: 2px; }
  .abn-badge-normal { background: #dcfce7; color: #166534; }
  .abn-badge-warning { background: #fef3c7; color: #92400e; }
  .abn-badge-error { background: #fee2e2; color: #991b1b; }
  .cond-row { margin-top: 4px; font-size: 10.5px; color: #1e40af; display: flex; align-items: flex-start; gap: 5px; flex-wrap: wrap; }
  .cond-code { font-family: monospace; font-size: 9.5px; background: #eff6ff; padding: 1px 4px; border-radius: 3px; }
  .val-row { margin-top: 4px; display: flex; flex-wrap: wrap; gap: 3px; }
</style>`;
}

export function buildFormDefinitionPdfBody(schema: any, opts: FormPdfOptions): string {
  const formTitle = (schema?.title?.trim() || schema?.name?.trim() || 'Form Definition');
  const entries = collectEntries(schema, opts);

  const legendParts: string[] = [];
  if (opts.showAbnormalities) legendParts.push('<span class="opt-dot dot-normal" style="display:inline-block;vertical-align:middle"></span> Normal &nbsp; <span class="opt-dot dot-warning" style="display:inline-block;vertical-align:middle"></span> Warning &nbsp; <span class="opt-dot dot-error" style="display:inline-block;vertical-align:middle"></span> Error');

  let body = `<h1>${escHtml(formTitle)}</h1>`;
  body += `<p class="subtitle">Form definition export${legendParts.length ? ` &nbsp;·&nbsp; ${legendParts.join(' &nbsp;·&nbsp; ')}` : ''}</p>`;

  for (const entry of entries) {
    if (entry.type === 'section') {
      body += `<div class="section-header pdf-avoid-break"><div class="step-num">Step ${entry.index + 1}</div><h2>${escHtml(entry.title)}</h2></div>`;
    } else {
      body += renderField(entry.comp, opts, entry.depth);
    }
  }

  if (entries.filter(e => e.type === 'field').length === 0) {
    body += `<p style="color:#888;font-size:11px">No fields found in form schema.</p>`;
  }

  return `${buildStyles()}<div>${body}</div>`;
}
