/**
 * SurveyFlow Data Source helpers.
 *
 * Industry-standard approach: use Formio's built-in "select" component with
 * dataSrc:"url" pointing to our /api/data-sources/query/{sourceKey} endpoint.
 *
 * No custom Formio component type — zero "Unknown component" risk.
 * Formio handles loading, search, value binding, and rendering natively.
 *
 * The helper buildDataSourceSelectSchema() is used by the admin when dropping
 * a data source field into a form. The URL is resolved from the source key.
 */

export function getApiBase(): string {
  return (window as any).__SURVEYFLOW_API_BASE__ ?? '';
}

/**
 * Returns a standard Formio select schema that fetches options from our API.
 * Use this when programmatically inserting a data source field into a form.
 */
export function buildDataSourceSelectSchema(opts: {
  key: string;
  label: string;
  sourceKey: string;         // the integration source name, e.g. "mex"
  placeholder?: string;
  required?: boolean;
  searchEnabled?: boolean;
}): Record<string, unknown> {
  // Auth is injected by the Formio request plugin in AppComponent — no headers in schema.
  const base = getApiBase();
  const url = base
    ? `${base}/api/data-sources/query/${encodeURIComponent(opts.sourceKey)}`
    : `/api/data-sources/query/${encodeURIComponent(opts.sourceKey)}`;
  return {
    type: 'select',
    input: true,
    key: opts.key,
    label: opts.label,
    placeholder: opts.placeholder ?? 'Select…',
    dataSrc: 'url',
    data: { url },
    valueProperty: 'value',
    template: '<span>{{ item.label }}</span>',
    searchEnabled: opts.searchEnabled ?? true,
    searchField: 'q',
    lazyLoad: false,
    validate: { required: opts.required ?? false },
    properties: { sfSourceKey: opts.sourceKey },
  };
}

/**
 * Registers a custom Formio builder component ("SurveyFlow Data Source") that
 * appears in the sidebar and inserts a pre-configured select when dropped.
 * This is builder-only — no custom component type is stored in the schema.
 */
export function registerDataSourceBuilderComponent(
  dataSources: { value: string; label: string }[],
  FormioRef: any,
): void {
  if (!FormioRef) return;

  const Builders = FormioRef?.Builders;
  if (!Builders?.builders?.webform) return;

  const webform = Builders.builders.webform;
  if (!webform.groups) webform.groups = {};

  webform.groups['surveyflow'] = {
    title: 'SurveyFlow',
    weight: 99,
    default: false,
    components: {},
  };

  // Register one builder entry per data source so the admin can pick directly
  dataSources.forEach(ds => {
    const compKey = `sf_${ds.value}`;
    webform.groups['surveyflow'].components[compKey] = true;

    const Components = FormioRef?.Components?.components;
    if (!Components || Components[compKey]) return;

    const SelectComp = Components['select'];
    if (!SelectComp) return;

    // A thin wrapper that just provides builder metadata; the schema is a plain select
    class DataSourceBuilderEntry extends SelectComp {
      static schema() {
        // Use absolute URL so it works in both builder and fill-form contexts.
        // Auth is handled by the Formio request plugin installed in AppComponent.
        const base = getApiBase();
        const url = base
          ? `${base}/api/data-sources/query/${encodeURIComponent(ds.value)}`
          : `/api/data-sources/query/${encodeURIComponent(ds.value)}`;
        return SelectComp.schema({
          type: 'select',
          label: ds.label,
          key: ds.value.replace(/[^a-z0-9]/gi, '_'),
          dataSrc: 'url',
          data: { url },
          valueProperty: 'value',
          template: '<span>{{ item.label }}</span>',
          searchEnabled: true,
          searchField: 'q',
          lazyLoad: false,
          properties: { sfSourceKey: ds.value },
        });
      }

      static get builderInfo() {
        return {
          title: ds.label,
          group: 'surveyflow',
          icon: 'database',
          weight: 10,
          schema: DataSourceBuilderEntry.schema(),
        };
      }
    }

    FormioRef.Components.addComponent(compKey, DataSourceBuilderEntry);
  });
}
