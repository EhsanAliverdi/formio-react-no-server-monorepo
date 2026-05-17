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
import { ActivatedRoute } from '@angular/router';
import { FormService } from '../../../core/services/form.service';
import { Formio } from 'formiojs';
import { take } from 'rxjs/operators';
import { patchSchemaUrls } from '../../../core/utils/schema-patch';

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

function buildLabelMap(schema: any): Record<string, string> {
  const map: Record<string, string> = {};
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.key && node.label && node.type !== 'button') map[node.key] = node.label;
    for (const c of (node.components ?? [])) walk(c);
    for (const col of (node.columns ?? [])) for (const c of (col.components ?? [])) walk(c);
  };
  walk(schema);
  return map;
}

type SubmitResult = { level: 'success' | 'warning' | 'error'; message: string };

@Component({
  selector: 'app-public-form-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 flex items-start justify-center py-8 px-4">
      <div class="w-full max-w-3xl bg-white rounded-xl border border-gray-200 shadow-sm p-6">

        @if (loading()) {
          <div class="flex justify-center py-16">
            <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (!form()) {
          <div class="rounded-lg border border-gray-200 p-6 text-center text-gray-700">
            This form is not available.
          </div>
        } @else if (submitResult()) {
          <!-- Post-submit result -->
          <div class="rounded-lg p-6 text-center"
            [class]="submitResult()!.level === 'error'
              ? 'border border-red-200 bg-red-50'
              : submitResult()!.level === 'warning'
                ? 'border border-amber-200 bg-amber-50'
                : 'border border-green-200 bg-green-50'">
            <p class="text-lg font-semibold"
              [class]="submitResult()!.level === 'error'
                ? 'text-red-800'
                : submitResult()!.level === 'warning'
                  ? 'text-amber-800'
                  : 'text-green-800'">
              {{ submitResult()!.message }}
            </p>
          </div>
        } @else if (previewOpen()) {
          <!-- Preview before submit -->
          <div class="mb-2">
            @if (formTitle()) {
              <h1 class="text-xl font-bold text-gray-900 mb-4">{{ formTitle() }}</h1>
            }
            <h2 class="text-base font-semibold text-gray-800 mb-3">Review your answers</h2>
            <div class="rounded-lg border border-gray-200 divide-y divide-gray-100">
              @for (item of previewItems(); track item.key) {
                <div class="px-4 py-3 flex gap-4">
                  <span class="w-1/3 text-sm font-medium text-gray-600 shrink-0">{{ item.label }}</span>
                  <span class="text-sm text-gray-900 break-words">{{ item.value }}</span>
                </div>
              }
            </div>
            <div class="mt-4 flex gap-3">
              <button type="button" (click)="closePreview()"
                class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition">
                ← Back
              </button>
              <button type="button" (click)="confirmSubmit()" [disabled]="submitting()"
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                @if (submitting()) { Submitting… } @else { Confirm & Submit }
              </button>
            </div>
          </div>
        } @else {
          <!-- Header -->
          @if (formTitle()) {
            <h1 class="text-xl font-bold text-gray-900 mb-1">{{ formTitle() }}</h1>
          }
          @if (publicDescription()) {
            <p class="text-sm text-gray-600 mb-4">{{ publicDescription() }}</p>
          }

          <!-- Wizard step pills -->
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

          <!-- Form.io render target -->
          <div class="formio-scope" [class.flowbite-stepper-wizard]="isWizard()">
            <div #formContainer></div>
          </div>

          <!-- Wizard nav buttons -->
          @if (isWizard() && panels().length > 1) {
            <div class="mt-4 flex gap-3">
              @if (step() > 0) {
                <button type="button" (click)="prevStep()"
                  class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition">
                  ← Previous
                </button>
              }
              @if (step() < panels().length - 1) {
                <button type="button" (click)="nextStep()"
                  class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">
                  Next →
                </button>
              }
              @if (step() === panels().length - 1) {
                <button type="button" (click)="handleSubmitClick()" [disabled]="submitting()"
                  class="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                  @if (submitting()) { Submitting… } @else { Submit }
                </button>
              }
            </div>
          }
        }

      </div>
    </div>
  `,
})
export class PublicFormPageComponent implements OnInit, OnDestroy {
  @ViewChild('formContainer', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private formService = inject(FormService);
  private zone = inject(NgZone);

  form = signal<any>(null);
  loading = signal(true);
  submitting = signal(false);
  submitResult = signal<SubmitResult | null>(null);
  previewOpen = signal(false);
  step = signal(0);
  previewItems = signal<{ key: string; label: string; value: string }[]>([]);

  panels = computed<Panel[]>(() => getPanels(this.form()));
  isWizard = computed(() => this.form()?.display === 'wizard' || this.panels().length > 0);
  formTitle = computed(() => this.form()?.title || this.form()?.name || '');
  publicDescription = computed(() => this.form()?.appSettings?.publicDescription?.trim() || null);
  appSettings = computed(() => this.form()?.appSettings ?? {});

  panelTitle = panelTitle;

  private formInstance: any = null;
  private pendingData: any = null;
  private labelMap: Record<string, string> = {};

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); return; }
    this.formService.get(+id, 'public').subscribe({
      next: (res) => {
        let schema = res.json;
        if (typeof schema === 'string') { try { schema = JSON.parse(schema); } catch { schema = null; } }
        schema = patchSchemaUrls(schema, (window as any).__SURVEYFLOW_API_BASE__ ?? '');
        this.labelMap = buildLabelMap(schema);
        this.form.set(schema);
        this.loading.set(false);
        this.zone.onStable.pipe(take(1)).subscribe(() => {
          requestAnimationFrame(() => this.mountForm());
        });
      },
      error: () => { this.form.set(null); this.loading.set(false); },
    });
  }

  ngOnDestroy(): void {
    this.formInstance?.destroy?.(true);
    this.formInstance = null;
  }

  private mountForm(): void {
    if (!this.form()) return;
    if (!this.containerRef?.nativeElement) {
      requestAnimationFrame(() => this.mountForm());
      return;
    }
    this.formInstance?.destroy?.(true);
    this.containerRef.nativeElement.innerHTML = '';

    const schema = structuredClone(this.form());
    if (this.isWizard() && this.panels().length > 0) {
      schema.components = [this.panels()[this.step()]];
      schema.display = 'form';
    }

    const isLastStep = !this.isWizard() || this.step() === this.panels().length - 1;

    Formio.createForm(this.containerRef.nativeElement, schema, {
      noDefaultSubmitButton: true,
    }).then((instance: any) => {
      this.formInstance = instance;
      instance.on('submit', (submission: any) => {
        const data = submission?.data ?? submission;
        this.pendingData = { ...(this.pendingData ?? {}), ...data };
        if (isLastStep) {
          this.handleSubmitClick();
        } else {
          this.advanceStep();
        }
      });
    });
  }

  nextStep(): void {
    // Trigger Formio validation — only advances via 'submit' event if valid
    this.formInstance?.submit();
  }

  private advanceStep(): void {
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

  handleSubmitClick(): void {
    const data = this.formInstance?.submission?.data ?? {};
    this.pendingData = { ...(this.pendingData ?? {}), ...data };

    if (this.appSettings().previewBeforeSubmit) {
      this.previewItems.set(
        Object.entries(this.pendingData ?? {})
          .filter(([k]) => k !== 'submit')
          .map(([k, v]) => ({
            key: k,
            label: this.labelMap[k] || k,
            value: v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v),
          }))
      );
      this.previewOpen.set(true);
    } else {
      this.doSubmit();
    }
  }

  closePreview(): void {
    this.previewOpen.set(false);
  }

  confirmSubmit(): void {
    this.doSubmit();
  }

  private doSubmit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.formService.submit(id, this.pendingData ?? {}).subscribe({
      next: (res: any) => {
        this.submitting.set(false);
        this.previewOpen.set(false);
        this.handleSubmitResult(res);
      },
      error: (err: any) => {
        this.submitting.set(false);
        const msg = this.appSettings().messageOnError || err?.error?.message || 'Failed to submit form.';
        this.submitResult.set({ level: 'error', message: msg });
      },
    });
  }

  private handleSubmitResult(res: any): void {
    const settings = this.appSettings();
    let level: 'success' | 'warning' | 'error';
    let message: string;
    let redirect: string | undefined;

    if (res?.has_errors) {
      level = 'error';
      message = settings.messageOnError || 'Your submission contains errors.';
      redirect = settings.redirectOnError;
    } else if (res?.has_warnings) {
      level = 'warning';
      message = settings.messageOnWarning || 'Submission received with warnings.';
      redirect = settings.redirectOnWarning;
    } else {
      level = 'success';
      message = settings.messageOnSuccess || 'Form submitted successfully!';
      redirect = settings.redirectOnSuccess;
    }

    this.submitResult.set({ level, message });

    if (redirect) {
      // Always navigate after 20 seconds — user sees the message first
      setTimeout(() => { window.location.href = redirect!; }, 20_000);
    }
  }
}
