import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ElementRef,
  ViewChild,
  inject,
  NgZone,
} from '@angular/core';
import { take } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../../core/services/api.service';
import { Formio } from 'formiojs';
import { registerDataSourceBuilderComponent } from './surveyflow-datasource.component';

let abnormalitiesInstalled = false;
const showWhenAbnormalitiesEnabled =
  "show = !!(data && data.properties && (data.properties.abnormal_enabled === true || data.properties.abnormal_enabled === 'true'));";

function installAbnormalitiesTab(): void {
  if (abnormalitiesInstalled) return;
  const components = (Formio as any)?.Components?.components;
  if (!components || typeof components !== 'object') return;

  const inject = (editForm: any) => {
    if (!editForm || typeof editForm !== 'object') return editForm;
    const rootComps: any[] = Array.isArray(editForm.components) ? editForm.components : [];
    const findTabs = (items: any[]): any => {
      for (const item of items) {
        if (!item || typeof item !== 'object') continue;
        if (item.type === 'tabs' && Array.isArray(item.components)) return item;
        if (Array.isArray(item.components)) {
          const found = findTabs(item.components);
          if (found) return found;
        }
      }
      return null;
    };
    const tabs = findTabs(rootComps);
    if (!tabs) return editForm;
    const already = (tabs.components as any[]).some(
      (t: any) => t?.key === 'abnormalities' || t?.label === 'Abnormalities'
    );
    if (already) return editForm;
    tabs.components = [
      ...tabs.components,
      {
        key: 'abnormalities',
        label: 'Abnormalities',
        weight: 999,
        components: [
          {
            type: 'checkbox', input: true,
            key: 'properties.abnormal_enabled',
            label: 'Enable Abnormalities',
            tooltip: 'When enabled, submissions will be checked against the Normal Answer.',
          },
          {
            type: 'htmlelement',
            tag: 'div',
            content: '<div class="alert alert-info mb-3"><strong>Answer rules</strong><br>Use submitted values, not display labels. For option fields this is the option value. Exact matches are used.</div>',
            customConditional: showWhenAbnormalitiesEnabled,
          },
          {
            type: 'datagrid',
            input: true,
            key: 'properties.abnormal_normal_values',
            label: 'Normal answers',
            addAnother: 'Add normal answer',
            reorder: false,
            tooltip: 'If the submitted answer matches any value here, it is not flagged.',
            customConditional: showWhenAbnormalitiesEnabled,
            components: [
              {
                type: 'textfield',
                input: true,
                key: 'value',
                label: 'Answer value',
                placeholder: 'yes',
              },
            ],
          },
          {
            type: 'datagrid',
            input: true,
            key: 'properties.abnormal_error_values',
            label: 'Answers that create an error',
            addAnother: 'Add error answer',
            reorder: false,
            tooltip: 'If the submitted answer matches any value here, it is flagged as an error.',
            customConditional: showWhenAbnormalitiesEnabled,
            components: [
              {
                type: 'textfield',
                input: true,
                key: 'value',
                label: 'Answer value',
                placeholder: 'no',
              },
            ],
          },
          {
            type: 'datagrid',
            input: true,
            key: 'properties.abnormal_warning_values',
            label: 'Answers that create a warning',
            addAnother: 'Add warning answer',
            reorder: false,
            tooltip: 'If the submitted answer matches any value here, it is flagged as a warning.',
            customConditional: showWhenAbnormalitiesEnabled,
            components: [
              {
                type: 'textfield',
                input: true,
                key: 'value',
                label: 'Answer value',
                placeholder: 'unknown',
              },
            ],
          },
          {
            type: 'select', input: true,
            key: 'properties.abnormal_default_level',
            label: 'Any other answer',
            tooltip: 'Used when normal answers are configured and the submitted answer does not match normal, error, or warning values.',
            defaultValue: 'error',
            dataSrc: 'values',
            data: { values: [{ label: 'No flag', value: 'none' }, { label: 'Error', value: 'error' }, { label: 'Warning', value: 'warning' }] },
            customConditional: showWhenAbnormalitiesEnabled,
          },
        ],
      },
    ];
    return editForm;
  };

  for (const comp of Object.values(components) as any[]) {
    if (!comp || typeof comp.editForm !== 'function') continue;
    if (comp.editForm.__abnormalitiesPatched) continue;
    const original = comp.editForm;
    const patched = (...args: any[]) => inject(original(...args));
    patched.__abnormalitiesPatched = true;
    comp.editForm = patched;
  }
  abnormalitiesInstalled = true;
}

function initSidebarAccordion(root: HTMLElement): () => void {
  const getCollapseEl = (btn: Element): HTMLElement | null => {
    const target = (btn as HTMLElement).getAttribute('data-target') || (btn as HTMLElement).getAttribute('data-bs-target');
    if (!target?.startsWith('#')) return null;
    return root.querySelector(target) as HTMLElement | null;
  };
  const onClick = (e: MouseEvent) => {
    const btn = (e.target as Element)?.closest('button[data-toggle="collapse"],button[data-bs-toggle="collapse"]');
    if (!btn) return;
    const collapse = getCollapseEl(btn);
    if (!collapse) return;
    e.preventDefault();
    const isOpen = collapse.classList.contains('show');
    collapse.classList.toggle('show', !isOpen);
    (btn as HTMLElement).setAttribute('aria-expanded', String(!isOpen));
    if (!isOpen) {
      const parentSel = collapse.getAttribute('data-parent') || collapse.getAttribute('data-bs-parent');
      if (parentSel) {
        root.querySelectorAll<HTMLElement>(`${parentSel} .collapse.show`).forEach(el => {
          if (el !== collapse) {
            el.classList.remove('show');
            const b = root.querySelector(`[data-target="#${el.id}"],[data-bs-target="#${el.id}"]`);
            if (b) (b as HTMLElement).setAttribute('aria-expanded', 'false');
          }
        });
      }
    }
  };
  root.addEventListener('click', onClick);
  // Open first group by default
  const first = root.querySelector<HTMLElement>('.builder-sidebar .collapse');
  if (first && !first.classList.contains('show')) {
    first.classList.add('show');
    const btn = root.querySelector(`[data-target="#${first.id}"],[data-bs-target="#${first.id}"]`);
    if (btn) (btn as HTMLElement).setAttribute('aria-expanded', 'true');
  }
  return () => root.removeEventListener('click', onClick);
}

@Component({
  selector: 'app-form-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="formio-builder-shell formio-scope">
      <div #builderContainer></div>
    </div>
  `,
})
export class FormEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('builderContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  @Input() formSchema: any = {};
  @Output() schemaChange = new EventEmitter<any>();

  private api = inject(ApiService);
  private http = inject(HttpClient);
  private zone = inject(NgZone);

  private builder: any = null;
  private sidebarCleanup: (() => void) | null = null;
  private dialogObserver: MutationObserver | null = null;
  private wizardHeaderObserver: MutationObserver | null = null;
  private lastEmittedJson: string | null = null;
  private lastAppliedJson: string | null = null;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => this.initBuilder());
      });
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['formSchema'] && this.builder) {
      const json = JSON.stringify(this.formSchema ?? {});
      if (json === this.lastEmittedJson) return;
      if (json === this.lastAppliedJson) return;

      const prevDisplay = changes['formSchema'].previousValue?.display;
      const nextDisplay = this.formSchema?.display;
      if (prevDisplay !== nextDisplay && (prevDisplay === 'wizard' || nextDisplay === 'wizard')) {
        // Switching between wizard and single-page requires a full builder rebuild
        this.rebuildWithSchema(structuredClone(this.formSchema));
        return;
      }

      this.lastAppliedJson = json;
      this.builder.setForm(structuredClone(this.formSchema));
    }
  }

  private rebuildWithSchema(schema: any): void {
    this.sidebarCleanup?.();
    this.sidebarCleanup = null;
    this.dialogObserver?.disconnect();
    this.wizardHeaderObserver?.disconnect();
    this.dialogObserver = null;
    this.wizardHeaderObserver = null;
    this.containerRef.nativeElement.removeEventListener('click', this.onWizardHeaderClick);
    this.builder?.destroy(true);
    this.builder = null;
    this.lastEmittedJson = null;
    this.lastAppliedJson = null;
    this.formSchema = schema;
    this.zone.runOutsideAngular(() => {
      requestAnimationFrame(() => this.initBuilder());
    });
  }

  ngOnDestroy(): void {
    this.sidebarCleanup?.();
    this.dialogObserver?.disconnect();
    this.wizardHeaderObserver?.disconnect();
    this.dialogObserver = null;
    this.wizardHeaderObserver = null;
    this.containerRef?.nativeElement?.removeEventListener('click', this.onWizardHeaderClick);
    document.body.classList.remove('formio-dialog-open');
    this.builder?.destroy(true);
    this.builder = null;
  }

  getSchema(): any {
    return this.builder?.schema ?? this.formSchema;
  }

  private initBuilder(): void {
    if (!this.containerRef?.nativeElement) {
      requestAnimationFrame(() => this.initBuilder());
      return;
    }

    installAbnormalitiesTab();

    // Fetch data sources FIRST, register them into the Formio sidebar,
    // then start the builder so the sidebar group is visible immediately.
    const fallbackStart = window.setTimeout(() => this.startBuilder(), 1500);
    this.http.get<any[]>(this.api.apiUrl('/api/data-sources')).subscribe({
      next: (sources) => {
        const options = sources
          .filter(s => s.is_enabled)
          .map(s => ({ value: s.source_key, label: s.name }));
        if (options.length > 0) registerDataSourceBuilderComponent(options, Formio);
      },
      error: () => { /* not fatal — builder continues without data source group */ },
      complete: () => {
        window.clearTimeout(fallbackStart);
        this.startBuilder();
      },
    });
  }

  private startBuilder(): void {
    if (this.builder) return;
    const schema = structuredClone(this.formSchema ?? {});
    if (!Array.isArray(schema.components)) schema.components = [];
    this.lastAppliedJson = JSON.stringify(schema);

    const token = localStorage.getItem('authToken') || '';
    const base = this.api.apiUrl('');

    Formio.setBaseUrl(base);
    Formio.setToken(token);

    (Formio as any).builder(this.containerRef.nativeElement, schema, {
      project: false,
      saveDraft: false,
      noDefaultSubmitButton: true,
    }).then((builder: any) => {
      this.builder = builder;

      if (!this.sidebarCleanup) {
        this.sidebarCleanup = initSidebarAccordion(this.containerRef.nativeElement);
      }

      builder.on('change', () => {
        const s = structuredClone(builder.schema);
        this.lastEmittedJson = JSON.stringify(s);
        this.zone.run(() => this.schemaChange.emit(s));
      });

      this.dialogObserver = new MutationObserver(() => {
        const hasDialog = !!document.body.querySelector('.formio-dialog');
        document.body.classList.toggle('formio-dialog-open', hasDialog);
      });
      this.dialogObserver.observe(document.body, { childList: true });
      this.installWizardHeaderEditing();
    });
  }

  private installWizardHeaderEditing(): void {
    const root = this.containerRef.nativeElement;
    const render = () => this.renderWizardHeaderEditing();
    render();
    this.wizardHeaderObserver?.disconnect();
    this.wizardHeaderObserver = new MutationObserver(render);
    this.wizardHeaderObserver.observe(root, { childList: true, subtree: true });
    root.addEventListener('click', this.onWizardHeaderClick);
  }

  private onWizardHeaderClick = (event: Event): void => {
    const button = (event.target as HTMLElement)?.closest<HTMLButtonElement>('[data-sf-wizard-action]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();

    const action = button.dataset['sfWizardAction'];
    const index = Number(button.dataset['sfWizardIndex']);
    if (!Number.isFinite(index)) return;

    if (action === 'rename') this.renameWizardPage(index);
    if (action === 'delete') this.deleteWizardPage(index);
    if (action === 'left') this.moveWizardPage(index, -1);
    if (action === 'right') this.moveWizardPage(index, 1);
  };

  private renderWizardHeaderEditing(): void {
    const root = this.containerRef?.nativeElement;
    if (!root) return;

    const header = root.querySelector<HTMLElement>('.wizard-pages');
    if (!header || header.dataset['sfWizardEditable'] === 'true') return;

    const items = Array.from(header.querySelectorAll<HTMLElement>('li:not(.wizard-add-page)'));
    if (!items.length) return;
    header.dataset['sfWizardEditable'] = 'true';
    items.forEach((item, index) => {
      const label = item.querySelector<HTMLElement>('.wizard-page-label');
      if (!label || label.querySelector('[data-sf-wizard-action]')) return;

      label.insertAdjacentHTML('beforeend', `
        <span class="sf-wizard-page-actions">
          <button type="button" data-sf-wizard-action="rename" data-sf-wizard-index="${index}" title="Rename page">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.232 5.232l3.536 3.536M9 11l6.586-6.586a2 2 0 112.828 2.828L11.828 13.828A2 2 0 0110 14.414H8v-2a2 2 0 01.586-1.414z"/></svg>
          </button>
          <button type="button" data-sf-wizard-action="delete" data-sf-wizard-index="${index}" title="Delete page">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
          ${index > 0 ? `<button type="button" data-sf-wizard-action="left" data-sf-wizard-index="${index}" title="Move left"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 19l-7-7 7-7"/></svg></button>` : ''}
          ${index < items.length - 1 ? `<button type="button" data-sf-wizard-action="right" data-sf-wizard-index="${index}" title="Move right"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg></button>` : ''}
        </span>
      `);
    });
  }

  private renameWizardPage(index: number): void {
    const schema = structuredClone(this.getSchema());
    const components = Array.isArray(schema.components) ? schema.components : [];
    const current = components[index];
    if (!current) return;

    const title = prompt('Rename page:', current.breadcrumb || current.title || current.label || `Page ${index + 1}`);
    if (!title?.trim()) return;

    components[index] = { ...current, breadcrumb: title.trim(), title: title.trim(), label: title.trim() };
    this.applyWizardSchema(schema);
  }

  private deleteWizardPage(index: number): void {
    const schema = structuredClone(this.getSchema());
    const components = Array.isArray(schema.components) ? schema.components : [];
    if (components.length <= 1 || !components[index]) return;
    if (!confirm('Delete this wizard page? Components on the page will be removed.')) return;

    components.splice(index, 1);
    this.applyWizardSchema(schema);
  }

  private moveWizardPage(index: number, direction: -1 | 1): void {
    const schema = structuredClone(this.getSchema());
    const components = Array.isArray(schema.components) ? schema.components : [];
    const target = index + direction;
    if (target < 0 || target >= components.length) return;

    [components[index], components[target]] = [components[target], components[index]];
    this.applyWizardSchema(schema);
  }

  private applyWizardSchema(schema: any): void {
    this.lastAppliedJson = JSON.stringify(schema);
    this.builder?.setForm(schema);
    this.lastEmittedJson = JSON.stringify(schema);
    this.zone.run(() => this.schemaChange.emit(structuredClone(schema)));
    setTimeout(() => this.renderWizardHeaderEditing(), 0);
  }
}
