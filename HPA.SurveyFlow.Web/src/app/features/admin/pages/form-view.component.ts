import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  signal,
  computed,
  inject,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { take } from 'rxjs/operators';
import { Formio } from 'formiojs';
import { FormService } from '../../../core/services/form.service';
import { SubmissionService } from '../../../core/services/submission.service';
import { Form } from '../../../core/models';
import { patchSchemaUrls } from '../../../core/utils/schema-patch';
import { buildFormDefinitionPdfBody, FormPdfOptions } from '../../../core/utils/form-definition-pdf';
import { PdfTemplateService } from '../../../core/services/pdf-template.service';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';

type Panel = { key: string; title: string; label: string; breadcrumb: string; components: any[] };

function isPanel(c: any): c is Panel {
  return c?.type === 'panel' && Array.isArray(c.components);
}

function getPanels(schema: any): Panel[] {
  return (Array.isArray(schema?.components) ? schema.components : []).filter(isPanel);
}

function panelTitle(p: Panel, i: number): string {
  return (p as any).breadcrumb || p.title || (p as any).label || p.key || `Step ${i + 1}`;
}

@Component({
  selector: 'app-admin-form-view',
  standalone: true,
  imports: [CommonModule, FormsModule, HelpTriggerComponent],
  template: `
    <div>
      <div class="flex items-center gap-3 mb-6">
        <button type="button" (click)="router.navigate(['/admin/forms'])"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1 class="text-2xl font-bold text-gray-900 flex-1">
          @if (form()) { {{ form()!.name }} } @else { View Form }
          <app-help-trigger helpKey="admin.form.view" label="Help for form preview" />
        </h1>
        @if (!loading() && form()) {
          <div class="ta-btn-group">
            <button type="button" (click)="showPdfDialog.set(true)" class="ta-btn-group-action">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
              Export PDF
            </button>
            <app-help-trigger helpKey="admin.form.export-pdf" label="Help for PDF export" [grouped]="true" />
          </div>
        }
      </div>

      @if (loading()) {
        <div class="flex justify-center items-center py-16">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      @if (error()) {
        <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      @if (!loading() && form()) {
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          @if (publicDescription()) {
            <p class="text-sm text-gray-600 mb-4">{{ publicDescription() }}</p>
          }

          @if (isWizard() && panels().length > 1) {
            <div class="mb-4 flex flex-wrap gap-2">
              @for (panel of panels(); track panel.key; let i = $index) {
                <div class="inline-flex items-center rounded-full border px-3 py-1 text-sm"
                  [class]="step() === i
                    ? 'border-blue-200 bg-blue-50 font-semibold text-blue-700'
                    : i < step()
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-gray-200 bg-white text-gray-500'">
                  {{ i + 1 }}. {{ panelTitle(panel, i) }}
                </div>
              }
            </div>
          }

          <div class="formio-scope" [class.flowbite-stepper-wizard]="isWizard()">
            <div #formContainer></div>
          </div>

          @if (isWizard() && panels().length > 1) {
            <div class="mt-4 flex gap-3">
              @if (step() > 0) {
                <button type="button" (click)="prevStep()"
                  class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition">
                  Previous
                </button>
              }
              @if (step() < panels().length - 1) {
                <button type="button" (click)="nextStep()"
                  class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">
                  Next
                </button>
              }
            </div>
          }
        </div>
      }
    </div>

    <!-- PDF Export Dialog -->
    @if (showPdfDialog()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" (click)="showPdfDialog.set(false)">
        <div class="absolute inset-0 bg-black/40"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6" (click)="$event.stopPropagation()">
          <h2 class="flex items-center gap-1 text-base font-semibold text-gray-900 mb-1">Export Form as PDF <app-help-trigger helpKey="admin.form.export-pdf" label="Help for PDF export" /></h2>
          <p class="text-xs text-gray-500 mb-4">Choose what to include in the export.</p>

          <div class="flex flex-col gap-3 mb-5">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" [(ngModel)]="pdfOptions.showAbnormalities" class="mt-0.5 rounded border-gray-300 text-indigo-600" />
              <div>
                <div class="flex items-center gap-1 text-sm font-medium text-gray-800">Abnormality rules <app-help-trigger helpKey="admin.form.pdf-abnormalities" label="Help for PDF abnormality rules" /></div>
                <div class="text-xs text-gray-500">Colour-code options: normal (green), warning (amber), error (red)</div>
              </div>
            </label>
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" [(ngModel)]="pdfOptions.showConditions" class="mt-0.5 rounded border-gray-300 text-indigo-600" />
              <div>
                <div class="flex items-center gap-1 text-sm font-medium text-gray-800">Conditional logic <app-help-trigger helpKey="admin.form.pdf-conditions" label="Help for PDF conditional logic" /></div>
                <div class="text-xs text-gray-500">Show the condition under which each question is displayed</div>
              </div>
            </label>
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" [(ngModel)]="pdfOptions.showValidation" class="mt-0.5 rounded border-gray-300 text-indigo-600" />
              <div>
                <div class="flex items-center gap-1 text-sm font-medium text-gray-800">Validation rules <app-help-trigger helpKey="admin.form.pdf-validation" label="Help for PDF validation rules" /></div>
                <div class="text-xs text-gray-500">Required, min/max length, patterns, etc.</div>
              </div>
            </label>
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" [(ngModel)]="pdfOptions.showKeys" class="mt-0.5 rounded border-gray-300 text-indigo-600" />
              <div>
                <div class="flex items-center gap-1 text-sm font-medium text-gray-800">Field keys <app-help-trigger helpKey="admin.form.pdf-keys" label="Help for PDF field keys" /></div>
                <div class="text-xs text-gray-500">Show the internal field key next to each label</div>
              </div>
            </label>
            @if (isWizard() && panels().length > 1) {
              <label class="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" [(ngModel)]="pdfOptions.groupBySteps" class="mt-0.5 rounded border-gray-300 text-indigo-600" />
                <div>
                  <div class="flex items-center gap-1 text-sm font-medium text-gray-800">Group by wizard steps <app-help-trigger helpKey="admin.form.pdf-steps" label="Help for PDF wizard steps" /></div>
                  <div class="text-xs text-gray-500">Add a section header for each step/panel</div>
                </div>
              </label>
            }
          </div>

          @if (pdfError()) {
            <div class="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{{ pdfError() }}</div>
          }

          <div class="flex gap-2 justify-end">
            <button type="button" (click)="showPdfDialog.set(false)"
              class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
              Cancel
            </button>
            <button type="button" (click)="exportPdf()" [disabled]="pdfExporting()"
              class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg transition">
              @if (pdfExporting()) {
                <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                Exporting…
              } @else {
                Export PDF
              }
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class FormViewComponent implements OnInit, OnDestroy {
  @ViewChild('formContainer', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  router = inject(Router);
  private route = inject(ActivatedRoute);
  private formService = inject(FormService);
  private submissionService = inject(SubmissionService);
  private pdfTemplate = inject(PdfTemplateService);
  private zone = inject(NgZone);

  form = signal<Form | null>(null);
  schema = signal<any>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  step = signal(0);

  showPdfDialog = signal(false);
  pdfExporting = signal(false);
  pdfError = signal<string | null>(null);

  pdfOptions: FormPdfOptions = {
    showConditions: true,
    showAbnormalities: true,
    showValidation: true,
    showKeys: false,
    groupBySteps: true,
  };

  panels = computed<Panel[]>(() => getPanels(this.schema()));
  isWizard = computed(() => this.schema()?.display === 'wizard' || this.panels().length > 0);
  publicDescription = computed(() => this.schema()?.appSettings?.publicDescription?.trim() || null);
  panelTitle = panelTitle;

  private formInstance: any = null;

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) {
      this.error.set('No form ID provided.');
      this.loading.set(false);
      return;
    }

    this.formService.get(Number(idStr)).subscribe({
      next: (f) => {
        let schema = f.json;
        if (typeof schema === 'string') {
          try { schema = JSON.parse(schema); } catch { schema = null; }
        }
        schema = patchSchemaUrls(schema, (window as any).__SURVEYFLOW_API_BASE__ ?? '');
        this.form.set(f);
        this.schema.set(schema);
        this.loading.set(false);
        this.zone.onStable.pipe(take(1)).subscribe(() => requestAnimationFrame(() => this.mountForm()));
      },
      error: (err) => {
        this.error.set(err?.error?.error || 'Failed to load form.');
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    this.formInstance?.destroy?.(true);
    this.formInstance = null;
  }

  nextStep(): void {
    if (this.step() < this.panels().length - 1) {
      this.step.update(s => s + 1);
      setTimeout(() => this.mountForm(), 0);
    }
  }

  prevStep(): void {
    if (this.step() > 0) {
      this.step.update(s => s - 1);
      setTimeout(() => this.mountForm(), 0);
    }
  }

  exportPdf(): void {
    const f = this.form();
    const schema = this.schema();
    if (!f || !schema) return;

    this.pdfError.set(null);
    this.pdfExporting.set(true);

    const body = buildFormDefinitionPdfBody(schema, this.pdfOptions);
    const fileName = `${f.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'form'}-definition.pdf`;

    this.pdfTemplate.wrap(body, { title: f.name, subtitle: 'Form Definition' }).subscribe((html) => {
      this.submissionService.exportAdminPdf(html, fileName).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
          this.pdfExporting.set(false);
          this.showPdfDialog.set(false);
        },
        error: (err) => {
          this.pdfExporting.set(false);
          this.pdfError.set(err?.error?.error || 'Failed to export PDF.');
        },
      });
    });
  }

  private mountForm(): void {
    if (!this.schema() || !this.containerRef?.nativeElement) {
      requestAnimationFrame(() => this.mountForm());
      return;
    }

    this.formInstance?.destroy?.(true);
    this.containerRef.nativeElement.innerHTML = '';

    const schema = structuredClone(this.schema());
    if (this.isWizard() && this.panels().length > 0) {
      schema.components = [this.panels()[this.step()]];
      schema.display = 'form';
    }

    Formio.createForm(this.containerRef.nativeElement, schema, {
      readOnly: true,
      noDefaultSubmitButton: true,
    }).then((instance: any) => {
      this.formInstance = instance;
      instance.disabled = true;
    });
  }
}
