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
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { Formio } from 'formiojs';

let abnormalitiesInstalled = false;

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
            type: 'textfield', input: true,
            key: 'properties.abnormal_normal_value',
            label: 'Normal Answer (Text)',
            placeholder: 'Enter the normal/expected answer',
            conditional: { when: 'properties.abnormal_enabled', eq: true },
            customConditional: "show = (data && data.type && ['textfield','textarea','email','phoneNumber','password','url'].includes(data.type));",
          },
          {
            type: 'number', input: true,
            key: 'properties.abnormal_normal_value',
            label: 'Normal Answer (Number)',
            conditional: { when: 'properties.abnormal_enabled', eq: true },
            customConditional: "show = (data && data.type && ['number'].includes(data.type));",
          },
          {
            type: 'checkbox', input: true,
            key: 'properties.abnormal_normal_value',
            label: 'Normal Answer (Checked)',
            conditional: { when: 'properties.abnormal_enabled', eq: true },
            customConditional: "show = (data && data.type && ['checkbox'].includes(data.type));",
          },
          {
            type: 'select', input: true,
            key: 'properties.abnormal_normal_value',
            label: 'Normal Answer',
            placeholder: 'Select the normal/expected option',
            dataSrc: 'custom',
            data: { custom: "const vals = (data && Array.isArray(data.values)) ? data.values : []; values = vals.map(v => ({ label: (v && (v.label || v.value)) || '', value: (v && v.value) }));" },
            conditional: { when: 'properties.abnormal_enabled', eq: true },
            customConditional: "show = (data && data.type && ['radio','select','selectboxes'].includes(data.type));",
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
  private zone = inject(NgZone);

  private builder: any = null;
  private sidebarCleanup: (() => void) | null = null;
  private dialogObserver: MutationObserver | null = null;
  private lastEmittedJson: string | null = null;
  private lastAppliedJson: string | null = null;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.initBuilder());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['formSchema'] && this.builder) {
      const json = JSON.stringify(this.formSchema ?? {});
      if (json === this.lastEmittedJson) return;
      if (json === this.lastAppliedJson) return;
      this.lastAppliedJson = json;
      this.builder.setForm(structuredClone(this.formSchema));
    }
  }

  ngOnDestroy(): void {
    this.sidebarCleanup?.();
    this.dialogObserver?.disconnect();
    this.dialogObserver = null;
    document.body.classList.remove('formio-dialog-open');
    this.builder?.destroy(true);
    this.builder = null;
  }

  getSchema(): any {
    return this.builder?.schema ?? this.formSchema;
  }

  private initBuilder(): void {
    installAbnormalitiesTab();

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

      // Watch for formio dialog being added/removed from body and toggle a class
      // so CSS can block sidebar/header pointer events while dialog is open.
      this.dialogObserver = new MutationObserver(() => {
        const hasDialog = !!document.body.querySelector('.formio-dialog');
        document.body.classList.toggle('formio-dialog-open', hasDialog);
      });
      this.dialogObserver.observe(document.body, { childList: true });
    });
  }
}
