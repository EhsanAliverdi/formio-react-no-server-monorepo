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
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { FormService } from '../../../core/services/form.service';
import { Formio } from 'formiojs';
import { take } from 'rxjs/operators';
import { patchSchemaUrls } from '../../../core/utils/schema-patch';
import { scheduleAbnormalAnswerColors } from '../../../core/utils/abnormal-answer-colors';

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
        <div class="rounded-lg p-6 text-center"
          [class]="submitResultLevel() === 'error'
            ? 'border border-red-200 bg-red-50'
            : submitResultLevel() === 'warning'
              ? 'border border-amber-200 bg-amber-50'
              : 'border border-green-200 bg-green-50'">
          <p class="text-lg font-semibold"
            [class]="submitResultLevel() === 'error'
              ? 'text-red-800'
              : submitResultLevel() === 'warning'
                ? 'text-amber-800'
                : 'text-green-800'">
            {{ submitMessage() || 'Form submitted successfully!' }}
          </p>
          @if (submitResultLevel() !== 'error') {
            <a routerLink="/forms/mysubmissions" class="mt-4 inline-flex items-center text-sm underline"
              [class]="submitResultLevel() === 'warning' ? 'text-amber-700' : 'text-green-700'">
              View my submissions
            </a>
          }
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
              <button type="button" (click)="goToStep(i)"
                class="inline-flex items-center rounded-full border px-3 py-1 text-sm transition"
                [class]="step() === i
                  ? 'border-blue-200 bg-blue-50 font-semibold text-blue-700'
                  : i < step()
                    ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-gray-200 bg-white text-gray-500'"
                [class.cursor-pointer]="i < step()"
                [class.cursor-default]="i >= step()">
                {{ i + 1 }}. {{ panelTitle(panel, i) }}
              </button>
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
              <button type="button" (click)="nextStep()" [disabled]="submitting()"
                class="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                @if (submitting()) { Submitting… } @else { Submit }
              </button>
            }
          </div>
        }
        @if (!isWizard()) {
          <div class="mt-4 flex gap-3">
            <button type="button" (click)="nextStep()" [disabled]="submitting()"
              class="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
              @if (submitting()) { Submitting… } @else { Submit }
            </button>
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
  private zone = inject(NgZone);

  form = signal<any>(null);
  loading = signal(true);
  submitting = signal(false);
  submitted = signal(false);
  submitResultLevel = signal<'success' | 'warning' | 'error' | null>(null);
  submitMessageTemplate = signal<string | null>(null);
  countdown = signal<number | null>(null);
  submitMessage = computed(() => {
    const tpl = this.submitMessageTemplate();
    if (!tpl) return null;
    const c = this.countdown();
    return c != null ? tpl.replaceAll('{{countdown}}', String(c)) : tpl.replaceAll('{{countdown}}', '');
  });
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
  private resultTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

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
        // Wait for Angular to flush the signal change to the DOM (onStable),
        // then wait one rAF so #formContainer is actually in the document.
        this.zone.onStable.pipe(take(1)).subscribe(() => {
          requestAnimationFrame(() => this.mountForm());
        });
      },
      error: () => { this.form.set(null); this.loading.set(false); },
    });
  }

  ngOnDestroy(): void {
    if (this.resultTimer) clearTimeout(this.resultTimer);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.formInstance?.destroy?.(true);
    this.formInstance = null;
  }

  private mountForm(): void {
    if (!this.form()) return;
    if (!this.containerRef?.nativeElement) {
      // Container not yet in DOM — retry after next paint
      requestAnimationFrame(() => this.mountForm());
      return;
    }
    this.formInstance?.destroy?.(true);
    this.containerRef.nativeElement.innerHTML = '';

    const schema = structuredClone(this.form());
    // For wizard, show only the current panel
    if (this.isWizard() && this.panels().length > 0) {
      schema.components = [this.panels()[this.step()]];
      schema.display = 'form';
    }

    const isLastStep = !this.isWizard() || this.step() === this.panels().length - 1;

    const submission = { data: structuredClone(this.pendingData ?? {}) };

    Formio.createForm(this.containerRef.nativeElement, schema, {
      noDefaultSubmitButton: true,
      submission,
    }).then((instance: any) => {
      this.formInstance = instance;
      if (Object.keys(submission.data).length > 0) {
        if (typeof instance.setSubmission === 'function') {
          instance.setSubmission(submission);
        } else {
          instance.submission = submission;
        }
      }
      if (this.appSettings().showColorCodedAnswers) {
        scheduleAbnormalAnswerColors(this.containerRef.nativeElement, schema);
      }
      instance.on('submit', (submission: any) => {
        const data = submission?.data ?? submission;
        this.pendingData = { ...(this.pendingData ?? {}), ...data };
        if (isLastStep) {
          this.handleSubmitClick();
        } else {
          // Validation passed — advance to next step
          this.advanceStep();
        }
      });
    });
  }

  nextStep(): void {
    // Trigger Formio validation — only advances via the 'submit' event if valid
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
      this.mergeCurrentFormData();
      this.step.update(s => s - 1);
      setTimeout(() => this.mountForm(), 0);
    }
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.panels().length || index >= this.step()) return;
    this.mergeCurrentFormData();
    this.step.set(index);
    setTimeout(() => this.mountForm(), 0);
  }

  handleSubmitClick(): void {
    this.mergeCurrentFormData();

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
    this.mergeCurrentFormData();
    this.doSubmit();
  }

  private mergeCurrentFormData(): void {
    const data = this.formInstance?.submission?.data ?? {};
    this.pendingData = { ...(this.pendingData ?? {}), ...data };
  }

  private doSubmit(): void {
    if (this.submitting()) return;
    this.submitting.set(true);
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.formService.submit(id, this.pendingData ?? {}, this.parentSubmissionId()).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.previewOpen.set(false);
        this.submitted.set(true);
        this.handleSubmitResult(res);
      },
      error: (err) => {
        this.submitting.set(false);
        const settings = this.appSettings();
        const msg = settings.messageOnError || err?.error?.message || 'Failed to submit form.';
        this.submitResultLevel.set('error');
        this.submitMessageTemplate.set(msg);
        this.submitted.set(true);
      },
    });
  }

  private handleSubmitResult(res: any): void {
    const settings = this.appSettings();
    let level: 'success' | 'warning' | 'error';
    let message: string;

    if (res?.has_errors) {
      level = 'error';
      message = settings.messageOnError || 'Your submission contains errors.';
    } else if (res?.has_warnings) {
      level = 'warning';
      message = settings.messageOnWarning || 'Submission received with warnings.';
    } else {
      level = 'success';
      message = settings.messageOnSuccess || 'Form submitted successfully!';
    }

    this.submitResultLevel.set(level);

    const action = this.resolveResultAction(settings, level, res);
    const delaySec = action.mode === 'stay' ? null : Math.max(0, Number(action.delaySeconds) || 0);
    const resolvedTemplate = this.applyMessagePlaceholders(message, level, res);

    this.countdown.set(delaySec);
    this.submitMessageTemplate.set(resolvedTemplate);

    if (action.mode === 'stay' || delaySec == null) return;

    if (delaySec === 0) {
      this.executeResultAction(action, res);
      return;
    }

    this.countdown.set(delaySec);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.countdownInterval = setInterval(() => {
      this.zone.run(() => {
        const c = (this.countdown() ?? 1) - 1;
        this.countdown.set(c);
        if (c <= 0) {
          clearInterval(this.countdownInterval!);
          this.countdownInterval = null;
          this.executeResultAction(action, res);
        }
      });
    }, 1000);
  }

  private executeResultAction(action: { mode: string; url?: string; nextFormId?: number }, res: any): void {
    if (action.mode === 'redirect') {
      window.location.href = action.url!;
    } else if (action.mode === 'next_form') {
      this.router.navigate(['/forms', action.nextFormId, 'fill'], {
        queryParams: { parent_submission_id: res.id },
      });
    }
  }

  private resolveResultAction(settings: any, level: 'success' | 'warning' | 'error', res: any): {
    mode: 'stay' | 'redirect' | 'next_form';
    delaySeconds: number;
    url?: string;
    nextFormId?: number;
  } {
    const configured = settings?.resultActions?.[level];
    const redirect = this.redirectForLevel(settings, level);
    const nextFormId = Number(res?.next_form_id);

    if (configured?.mode === 'redirect' && redirect) {
      return { mode: 'redirect', delaySeconds: Number(configured.delaySeconds) || 0, url: redirect };
    }

    if (configured?.mode === 'next_form' && Number.isFinite(nextFormId) && nextFormId > 0) {
      return { mode: 'next_form', delaySeconds: Number(configured.delaySeconds) || 0, nextFormId };
    }

    if (configured) return { mode: 'stay', delaySeconds: 0 };

    if (redirect) return { mode: 'redirect', delaySeconds: 20, url: redirect };
    if (Number.isFinite(nextFormId) && nextFormId > 0) return { mode: 'next_form', delaySeconds: 2, nextFormId };
    return { mode: 'stay', delaySeconds: 0 };
  }

  private redirectForLevel(settings: any, level: 'success' | 'warning' | 'error'): string | undefined {
    if (level === 'success') return settings.redirectOnSuccess;
    if (level === 'warning') return settings.redirectOnWarning;
    return settings.redirectOnError;
  }

  private applyMessagePlaceholders(message: string, level: 'success' | 'warning' | 'error', res: any): string {
    const abnormalities: any[] = Array.isArray(res?.abnormalities) ? res.abnormalities : [];
    const errors = abnormalities.filter(a => a?.level === 'error');
    const warnings = abnormalities.filter(a => a?.level === 'warning');
    const formatQuestion = (a: any) => a?.label || a?.key || 'Question';
    const formatAnswer = (a: any) => `${formatQuestion(a)}: ${this.valueToText(a?.actual_value)}`;

    return message
      .replaceAll('{{outcome}}', level)
      .replaceAll('{{error_count}}', String(res?.error_count ?? errors.length))
      .replaceAll('{{warning_count}}', String(res?.warning_count ?? warnings.length))
      .replaceAll('{{abnormal_questions}}', abnormalities.map(formatQuestion).join(', '))
      .replaceAll('{{error_questions}}', errors.map(formatQuestion).join(', '))
      .replaceAll('{{warning_questions}}', warnings.map(formatQuestion).join(', '))
      .replaceAll('{{abnormal_answers}}', abnormalities.map(formatAnswer).join(', '))
      .replaceAll('{{error_answers}}', errors.map(formatAnswer).join(', '))
      .replaceAll('{{warning_answers}}', warnings.map(formatAnswer).join(', '));
  }

  private valueToText(value: any): string {
    if (value == null) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private parentSubmissionId(): number | null {
    const raw = this.route.snapshot.queryParamMap.get('parent_submission_id');
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
}
