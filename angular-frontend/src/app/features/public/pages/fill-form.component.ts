import {
  Component,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { FormService } from '../../../core/services/form.service';
import { Formio } from 'formiojs';

type Panel = { key: string; title: string; label: string; breadcrumb: string; components: any[] };

function isPanel(c: any): c is Panel {
  return c?.type === 'panel' && Array.isArray(c.components);
}

function getPanels(schema: any): Panel[] {
  return (Array.isArray(schema?.components) ? schema.components : []).filter(isPanel);
}

function panelTitle(p: Panel, i: number): string {
  return p.breadcrumb || p.title || p.label || p.key || `Step ${i + 1}`;
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

@Component({
  selector: 'app-fill-form',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="w-full bg-white p-4 rounded-lg border border-gray-200">
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="min-w-0">
          <h1 class="text-2xl font-bold">{{ formTitle() }}</h1>
          @if (publicDescription()) {
            <div class="mt-1 text-sm text-gray-600">{{ publicDescription() }}</div>
          }
        </div>
        <a routerLink="/forms"
          class="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shrink-0 ml-4">
          Back to Forms
        </a>
      </div>

      @if (loading()) {
        <div class="text-gray-500">Loading form…</div>
      } @else if (!form()) {
        <div class="rounded-lg border border-gray-200 bg-white p-4 text-gray-700">This form is not available.</div>
      } @else if (submitted()) {
        <div class="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p class="text-lg font-semibold text-green-800">Form submitted successfully!</p>
          <a routerLink="/forms/mysubmissions" class="mt-4 inline-flex items-center text-sm text-green-700 underline">View my submissions</a>
        </div>
      } @else if (previewOpen()) {
        <!-- Preview before submit -->
        <div class="mb-4">
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
              ← Back to form
            </button>
            <button type="button" (click)="confirmSubmit()" [disabled]="submitting()"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
              @if (submitting()) { Submitting… } @else { Confirm & Submit }
            </button>
          </div>
        </div>
      } @else {
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
  `,
})
export class FillFormComponent implements OnInit, OnDestroy {
  @ViewChild('formContainer', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private formService = inject(FormService);
  private toastr = inject(ToastrService);

  form = signal<any>(null);
  loading = signal(true);
  submitting = signal(false);
  submitted = signal(false);
  previewOpen = signal(false);
  step = signal(0);
  previewItems = signal<{ key: string; label: string; value: string }[]>([]);

  panels = computed<Panel[]>(() => getPanels(this.form()));
  isWizard = computed(() => this.form()?.display === 'wizard' || this.panels().length > 0);
  formTitle = computed(() => this.form()?.title || this.form()?.name || 'Fill Form');
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
        this.labelMap = buildLabelMap(schema);
        this.form.set(schema);
        this.loading.set(false);
        setTimeout(() => this.mountForm(), 0);
      },
      error: () => { this.form.set(null); this.loading.set(false); },
    });
  }

  ngOnDestroy(): void {
    this.formInstance?.destroy?.(true);
    this.formInstance = null;
  }

  private mountForm(): void {
    if (!this.containerRef?.nativeElement || !this.form()) return;
    this.formInstance?.destroy?.(true);
    this.containerRef.nativeElement.innerHTML = '';

    const schema = structuredClone(this.form());
    // For wizard, show only the current panel
    if (this.isWizard() && this.panels().length > 0) {
      schema.components = [this.panels()[this.step()]];
      schema.display = 'form';
    }

    Formio.createForm(this.containerRef.nativeElement, schema, {
      noDefaultSubmitButton: !this.isWizard() || this.step() === this.panels().length - 1,
    }).then((instance: any) => {
      this.formInstance = instance;
      instance.on('submit', (submission: any) => {
        const data = submission?.data ?? submission;
        this.pendingData = { ...(this.pendingData ?? {}), ...data };
        if (!this.isWizard() || this.step() === this.panels().length - 1) {
          this.handleSubmitClick();
        }
      });
    });
  }

  nextStep(): void {
    // Collect current data
    const data = this.formInstance?.submission?.data ?? {};
    this.pendingData = { ...(this.pendingData ?? {}), ...data };
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
      next: () => {
        this.submitting.set(false);
        this.previewOpen.set(false);
        this.submitted.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.toastr.error(err?.error?.message || 'Failed to submit form.');
      },
    });
  }
}
