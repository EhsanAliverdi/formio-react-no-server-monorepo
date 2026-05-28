import { FormField } from '../../shared/components/condition-group-editor/condition-group-editor.component';

const SKIP_TYPES = new Set(['button', 'columns', 'panel', 'well', 'htmlelement', 'content']);

/**
 * Recursively walk a Formio schema and extract all input fields with
 * their key, label, type, and options (for radio/select components).
 */
export function extractFormioFields(schema: any): FormField[] {
  if (!schema) return [];
  const fields: FormField[] = [];

  function walk(components: any[]) {
    if (!Array.isArray(components)) return;
    for (const comp of components) {
      if (comp.key && comp.type && !SKIP_TYPES.has(comp.type)) {
        fields.push({
          key:     comp.key,
          label:   comp.label || comp.key,
          type:    mapFormioType(comp.type),
          options: extractOptions(comp),
        });
      }
      if (comp.components) walk(comp.components);
      if (comp.columns)    comp.columns.forEach((col: any) => walk(col.components ?? []));
      if (comp.rows)       comp.rows.forEach((row: any) => row.forEach((cell: any) => walk(cell.components ?? [])));
    }
  }

  walk(schema.components ?? []);
  return fields;
}

function mapFormioType(type: string): string {
  if (['number', 'currency'].includes(type)) return 'number';
  if (['checkbox'].includes(type))           return 'boolean';
  if (['radio', 'select', 'selectboxes'].includes(type)) return 'select';
  return 'text';
}

function extractOptions(comp: any): { label: string; value: string }[] | undefined {
  // radio / select: options live in comp.values
  if (Array.isArray(comp.values) && comp.values.length > 0) {
    return comp.values
      .filter((v: any) => v.value !== undefined && v.value !== null)
      .map((v: any) => ({ label: String(v.label ?? v.value), value: String(v.value) }));
  }
  // select with data.values
  if (comp.data?.values && Array.isArray(comp.data.values)) {
    return comp.data.values
      .filter((v: any) => v.value !== undefined)
      .map((v: any) => ({ label: String(v.label ?? v.value), value: String(v.value) }));
  }
  // checkbox is a single true/false toggle
  if (comp.type === 'checkbox') {
    return [{ label: 'Checked', value: 'true' }, { label: 'Unchecked', value: 'false' }];
  }
  return undefined;
}
