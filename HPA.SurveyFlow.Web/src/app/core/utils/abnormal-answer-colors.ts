type AnswerLevel = 'normal' | 'warning' | 'error';

type AnswerColorRule = {
  key: string;
  levels: Record<string, AnswerLevel>;
  defaultLevel?: 'none' | 'warning' | 'error';
  normalValues: Set<string>;
};

const LEVEL_CLASS: Record<AnswerLevel, string> = {
  normal: 'sf-answer-normal',
  warning: 'sf-answer-warning',
  error: 'sf-answer-error',
};

const LEVEL_TITLE: Record<AnswerLevel, string> = {
  normal: 'Normal answer.',
  warning: 'Warning answer. This may require acknowledgement or follow-up.',
  error: 'Critical answer. This may stop operation or require immediate action.',
};

export function applyAbnormalAnswerColors(container: HTMLElement, schema: any): void {
  const rules = buildAbnormalAnswerRules(schema);
  if (!rules.length) return;

  for (const rule of rules) {
    applyInputColors(container, rule);
    applySelectColor(container, rule);
  }
}

export function scheduleAbnormalAnswerColors(container: HTMLElement, schema: any): void {
  requestAnimationFrame(() => applyAbnormalAnswerColors(container, schema));
  for (const delay of [50, 200, 500]) {
    window.setTimeout(() => applyAbnormalAnswerColors(container, schema), delay);
  }
}

function applyInputColors(container: HTMLElement, rule: AnswerColorRule): void {
  const component = findComponentContainer(container, rule.key);
  const searchRoot = component ?? container;
  const controls = Array.from(searchRoot.querySelectorAll('input[type="radio"], input[type="checkbox"]'))
    .filter(input => component || isControlForKey(input as HTMLInputElement, rule.key)) as HTMLInputElement[];

  for (const input of controls) {
    const level = levelForValue(rule, input.value);
    const target = findChoiceLabel(input);
    if (!target) continue;

    clearLevelClasses(target);
    if (!level) continue;

    target.classList.add('sf-answer-choice', LEVEL_CLASS[level]);
    target.setAttribute('title', LEVEL_TITLE[level]);
  }
}

function applySelectColor(container: HTMLElement, rule: AnswerColorRule): void {
  const component = findComponentContainer(container, rule.key);
  const searchRoot = component ?? container;
  const selects = Array.from(searchRoot.querySelectorAll('select'))
    .filter(select => component || isControlForKey(select as HTMLSelectElement, rule.key)) as HTMLSelectElement[];

  for (const select of selects) {
    const refresh = () => {
      clearLevelClasses(select);
      const level = levelForValue(rule, select.value);
      if (!level) {
        select.removeAttribute('title');
        return;
      }

      select.classList.add('sf-answer-select', LEVEL_CLASS[level]);
      select.setAttribute('title', LEVEL_TITLE[level]);
    };

    refresh();
    if (select.dataset['sfAnswerColorBound'] !== 'true') {
      select.addEventListener('change', refresh);
      select.dataset['sfAnswerColorBound'] = 'true';
    }
  }
}

function findComponentContainer(container: HTMLElement, key: string): HTMLElement | null {
  const escapedSelector = cssEscape(key);
  const escapedAttribute = attributeEscape(key);
  return container.querySelector<HTMLElement>(
    `.formio-component-${escapedSelector}, [ref="${escapedAttribute}"], [data-key="${escapedAttribute}"]`
  );
}

function findChoiceLabel(input: HTMLInputElement): HTMLElement | null {
  const closestLabel = input.closest('label') as HTMLElement | null;
  if (closestLabel) return closestLabel;

  if (input.id) {
    const owner = input.closest('.formio-component') ?? document;
    const label = owner.querySelector<HTMLElement>(`label[for="${attributeEscape(input.id)}"]`);
    if (label) return label;
  }

  return input.closest('.form-check') as HTMLElement | null
    ?? input.parentElement;
}

function levelForValue(rule: AnswerColorRule, rawValue: unknown): AnswerLevel | null {
  const value = normalizeValue(rawValue);
  const configured = rule.levels[value];
  if (configured) return configured;
  if (rule.defaultLevel && rule.defaultLevel !== 'none' && !rule.normalValues.has(value)) {
    return rule.defaultLevel;
  }
  return null;
}

function buildAbnormalAnswerRules(schema: any): AnswerColorRule[] {
  const rules: AnswerColorRule[] = [];

  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    const props = node.properties;
    const enabled = props?.abnormal_enabled === true || props?.abnormal_enabled === 'true';
    if (enabled && node.key) {
      const levels: Record<string, AnswerLevel> = {};
      const normalValues = readConfiguredValues(props, 'abnormal_normal_values', 'abnormal_normal_value');
      for (const value of normalValues) levels[value] = 'normal';
      for (const value of readConfiguredValues(props, 'abnormal_warning_values')) levels[value] = 'warning';
      for (const value of readConfiguredValues(props, 'abnormal_error_values')) levels[value] = 'error';

      rules.push({
        key: node.key,
        levels,
        normalValues: new Set(normalValues),
        defaultLevel: props?.abnormal_default_level || props?.abnormal_level || 'none',
      });
    }

    for (const child of node.components ?? []) visit(child);
    for (const column of node.columns ?? []) for (const child of column.components ?? []) visit(child);
    for (const row of node.rows ?? []) for (const column of row ?? []) for (const child of column.components ?? []) visit(child);
  };

  visit(schema);
  return rules;
}

function readConfiguredValues(props: any, arrayKey: string, legacyKey?: string): string[] {
  const raw = props?.[arrayKey];
  const values: string[] = [];

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const value = typeof item === 'object' && item !== null && 'value' in item ? item.value : item;
      const normalized = normalizeValue(value);
      if (normalized) values.push(normalized);
    }
  }

  if (!values.length && legacyKey && props?.[legacyKey] !== undefined) {
    const normalized = normalizeValue(props[legacyKey]);
    if (normalized) values.push(normalized);
  }

  return Array.from(new Set(values));
}

function normalizeValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
}

function cssEscape(value: string): string {
  const css = (globalThis as any).CSS;
  if (css?.escape) return css.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

function attributeEscape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function isControlForKey(control: HTMLInputElement | HTMLSelectElement, key: string): boolean {
  return control.name === `data[${key}]`
    || control.name === key
    || control.getAttribute('data-key') === key
    || control.id.endsWith(`-${key}`)
    || control.id.includes(`[${key}]`);
}

function clearLevelClasses(element: Element): void {
  element.classList.remove('sf-answer-choice', 'sf-answer-select', LEVEL_CLASS.normal, LEVEL_CLASS.warning, LEVEL_CLASS.error);
}
