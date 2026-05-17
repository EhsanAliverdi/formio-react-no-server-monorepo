import { FieldDef, FieldGroup } from './mex-asset.field-map';

export interface RenderedField {
  label: string;
  value: string;
  type: string;
  isEmpty: boolean;
}

export interface RenderedGroup {
  title: string;
  fields: RenderedField[];
}

/** Format a raw value from JSON into a human-readable string. */
export function renderValue(raw: unknown, type: FieldDef['type']): string {
  if (raw === null || raw === undefined) return '—';

  switch (type) {
    case 'boolean':
      return raw === true ? 'Yes' : raw === false ? 'No' : '—';

    case 'date':
      if (!raw) return '—';
      try {
        const d = new Date(String(raw));
        return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch { return String(raw); }

    case 'datetime':
      if (!raw) return '—';
      try {
        const d = new Date(String(raw));
        return isNaN(d.getTime()) ? String(raw) : d.toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      } catch { return String(raw); }

    case 'currency':
      if (raw === 0 || raw === '0') return '$0';
      if (!raw) return '—';
      const num = Number(raw);
      return isNaN(num) ? String(raw) : num.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });

    case 'number':
      if (raw === 0) return '0';
      if (!raw) return '—';
      return Number(raw).toLocaleString();

    case 'multiline':
      if (!raw || String(raw).trim() === '') return '—';
      return String(raw);

    default:
      if (typeof raw === 'string') return raw.trim() || '—';
      if (typeof raw === 'number') return raw === 0 ? '0' : raw.toLocaleString();
      if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
      return String(raw);
  }
}

/** Returns true if the value should be considered empty (null/0/empty string). */
export function isEmpty(raw: unknown, type: FieldDef['type']): boolean {
  if (raw === null || raw === undefined) return true;
  if (typeof raw === 'string' && raw.trim() === '') return true;
  if (type === 'number' || type === 'currency') return raw === 0 || raw === '0';
  if (type === 'boolean') return false; // always show booleans
  return false;
}

/**
 * Render a raw JSON object against a field map, returning grouped sections.
 * Fields with hide_if_empty=true that are empty are omitted.
 * Remaining keys not in the map appear in an "Other Fields" section.
 */
export function renderGroups(raw: Record<string, unknown>, groups: FieldGroup[]): RenderedGroup[] {
  const mapped = new Set<string>();
  const result: RenderedGroup[] = [];

  for (const group of groups) {
    const fields: RenderedField[] = [];
    for (const def of group.fields) {
      mapped.add(def.key);
      const rawVal = raw[def.key];
      const type   = def.type ?? 'text';
      const empty  = isEmpty(rawVal, type);
      if (def.hide_if_empty && empty) continue;
      fields.push({ label: def.label, value: renderValue(rawVal, type), type, isEmpty: empty });
    }
    if (fields.length > 0) result.push({ title: group.title, fields });
  }

  // Catch-all: remaining keys not in any group
  const others: RenderedField[] = [];
  for (const [key, rawVal] of Object.entries(raw)) {
    if (mapped.has(key)) continue;
    if (rawVal === null || rawVal === undefined) continue;
    if (typeof rawVal === 'string' && rawVal.trim() === '') continue;
    if (typeof rawVal === 'object') continue; // skip nested objects
    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    others.push({ label, value: renderValue(rawVal, 'text'), type: 'text', isEmpty: false });
  }
  if (others.length > 0) result.push({ title: 'Other Fields', fields: others });

  return result;
}
