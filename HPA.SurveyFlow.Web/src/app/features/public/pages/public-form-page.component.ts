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
import { SettingsService } from '../../../core/services/settings.service';
import { SiteSettings } from '../../../core/models';
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

type SubmitResult = { level: 'success' | 'warning' | 'error'; message: string };

@Component({
  selector: 'app-public-form-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex min-h-screen flex-col relative overflow-hidden" style="background-color: #f0f4f8;">

      <!-- Dot mesh patches — scattered -->
      <svg class="pointer-events-none absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style="opacity:1;">
        <defs>
          <pattern id="dm-pfp" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#4a7fa5"/>
          </pattern>
        </defs>
        <rect x="60" y="80" width="140" height="100" rx="4" fill="url(#dm-pfp)" opacity="0.14"/>
        <rect x="78%" y="35%" width="110" height="80" rx="4" fill="url(#dm-pfp)" opacity="0.11"/>
        <rect x="22%" y="68%" width="90" height="70" rx="4" fill="url(#dm-pfp)" opacity="0.10"/>
        <rect x="82%" y="8%" width="120" height="90" rx="4" fill="url(#dm-pfp)" opacity="0.12"/>
        <rect x="4%" y="78%" width="100" height="75" rx="4" fill="url(#dm-pfp)" opacity="0.09"/>
      </svg>

      <!-- Decorative circles — bottom-right -->
      <svg class="pointer-events-none absolute" xmlns="http://www.w3.org/2000/svg"
           style="bottom:-60px;right:-120px;width:700px;height:700px;overflow:visible;">
        <circle cx="500" cy="580" r="390" fill="#4a7fa5" opacity="0.02"/>
        <circle cx="460" cy="520" r="255" fill="#4a7fa5" opacity="0.035"/>
      </svg>

      <!-- Decorative circles — top-left -->
      <svg class="pointer-events-none absolute" xmlns="http://www.w3.org/2000/svg"
           style="top:-40px;left:-90px;width:620px;height:620px;overflow:visible;">
        <circle cx="80" cy="60" r="330" fill="#4a7fa5" opacity="0.02"/>
        <circle cx="140" cy="110" r="200" fill="#4a7fa5" opacity="0.035"/>
      </svg>
      @if (showPublicFormLogo()) {
        <header class="px-4 pt-4 sm:px-6">
          <a href="/" class="inline-flex items-center">
            <img
              [src]="publicLogo().src"
              [alt]="publicLogo().alt"
              class="object-contain"
              [style.width.px]="publicLogo().width"
              [style.height.px]="publicLogo().height"
            />
          </a>
        </header>
      }

      <main class="flex flex-1 items-start justify-center px-4 py-8">
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
            @if (showStartOver()) {
              <div class="mt-5">
                <a [href]="startOverHref()"
                   class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" />
                  </svg>
                  Start Over
                </a>
              </div>
            }
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
          <div class="flex items-start justify-between gap-4 mb-1">
            <div>
              @if (formTitle()) {
                <h1 class="text-xl font-bold text-gray-900">{{ formTitle() }}</h1>
              }
              @if (publicDescription()) {
                <p class="text-sm text-gray-600 mt-1">{{ publicDescription() }}</p>
              }
            </div>
            @if (showStartOver()) {
              <a [href]="startOverHref()"
                 class="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Start Over
              </a>
            }
          </div>
          @if (!formTitle() && !publicDescription()) {
            <div class="mb-4"></div>
          }

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
      </main>

      @if (showCopyright()) {
        <footer class="px-4 pb-6 text-center text-xs text-gray-500">
          {{ copyrightText() }}
        </footer>
      }
    </div>
  `,
})
export class PublicFormPageComponent implements OnInit, OnDestroy {
  @ViewChild('formContainer', { static: false }) containerRef!: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private formService = inject(FormService);
  private settingsService = inject(SettingsService);
  private zone = inject(NgZone);

  form = signal<any>(null);
  loading = signal(true);
  submitting = signal(false);
  submitResultRaw = signal<SubmitResult | null>(null);
  countdown = signal<number | null>(null);
  submitResult = computed<SubmitResult | null>(() => {
    const r = this.submitResultRaw();
    if (!r) return null;
    const c = this.countdown();
    const message = c != null ? r.message.replaceAll('{{countdown}}', String(c)) : r.message.replaceAll('{{countdown}}', '');
    return { ...r, message };
  });
  previewOpen = signal(false);
  step = signal(0);
  previewItems = signal<{ key: string; label: string; value: string }[]>([]);
  siteSettings = signal<SiteSettings | null>(null);

  panels = computed<Panel[]>(() => getPanels(this.form()));
  isWizard = computed(() => this.form()?.display === 'wizard' || this.panels().length > 0);
  formTitle = computed(() => this.form()?.title || this.form()?.name || '');
  publicDescription = computed(() => this.form()?.appSettings?.publicDescription?.trim() || null);
  appSettings = computed(() => this.form()?.appSettings ?? {});
  categorySlug = computed(() => this.appSettings().categorySlug?.trim() || '');
  showStartOver = computed(() => !!this.categorySlug());
  startOverHref = computed(() => `/category/${encodeURIComponent(this.categorySlug())}`);
  copyrightText = computed(() => this.siteSettings()?.copyrightText?.trim() || null);
  showCopyright = computed(() => !!this.siteSettings()?.showCopyright && !!this.copyrightText());
  showPublicFormLogo = computed(() => !!this.siteSettings()?.showPublicFormLogo);
  publicLogo = computed(() => {
    const settings = this.siteSettings();
    return {
      src: settings?.logoExpandedLightUrl?.trim() || '/images/logo/logo.svg',
      alt: settings?.siteName?.trim() || 'SurveyFlow',
      width: Number(settings?.logoExpandedWidth) || 170,
      height: Number(settings?.logoExpandedHeight) || 40,
    };
  });

  panelTitle = panelTitle;

  private formInstance: any = null;
  private pendingData: any = null;
  private labelMap: Record<string, string> = {};
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.settingsService.getSiteSettings().subscribe({ next: s => this.siteSettings.set(s), error: () => {} });

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
    if (this.countdownInterval) clearInterval(this.countdownInterval);
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
      next: (res: any) => {
        this.submitting.set(false);
        this.previewOpen.set(false);
        this.handleSubmitResult(res);
      },
      error: (err: any) => {
        this.submitting.set(false);
        const msg = this.applyMessagePlaceholders(
          this.appSettings().messageOnError || err?.error?.message || 'Failed to submit form.',
          'error',
          err?.error
        );
        this.submitResultRaw.set({ level: 'error', message: msg });
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

    const resolvedTemplate = this.applyMessagePlaceholders(message, level, res);
    const action = this.resolveResultAction(settings, level, res);
    const delaySec = action.mode === 'stay' ? null : Math.max(0, Number(action.delaySeconds) || 0);

    this.countdown.set(delaySec);
    this.submitResultRaw.set({ level, message: resolvedTemplate });

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

  private resolveResultAction(settings: any, level: 'success' | 'warning' | 'error', res: any): {
    mode: 'stay' | 'redirect' | 'next_form';
    delaySeconds: number;
    url?: string;
    nextFormId?: number;
  } {
    const configured = settings?.resultActions?.[level];
    const redirect = level === 'success' ? settings.redirectOnSuccess
      : level === 'warning' ? settings.redirectOnWarning
      : settings.redirectOnError;
    const nextFormId = Number(res?.next_form_id);

    if (configured?.mode === 'redirect' && redirect) {
      return { mode: 'redirect', delaySeconds: Number(configured.delaySeconds) || 0, url: redirect };
    }
    if (configured?.mode === 'next_form' && Number.isFinite(nextFormId) && nextFormId > 0) {
      return { mode: 'next_form', delaySeconds: Number(configured.delaySeconds) || 0, nextFormId };
    }
    if (configured) return { mode: 'stay', delaySeconds: 0 };

    if (redirect) return { mode: 'redirect', delaySeconds: 10, url: redirect };
    if (Number.isFinite(nextFormId) && nextFormId > 0) return { mode: 'next_form', delaySeconds: 2, nextFormId };
    return { mode: 'stay', delaySeconds: 0 };
  }

  private executeResultAction(action: { mode: string; url?: string; nextFormId?: number }, res: any): void {
    if (action.mode === 'redirect') {
      window.location.href = action.url!;
    } else if (action.mode === 'next_form') {
      window.location.href = `/form-public/${action.nextFormId}?parent_submission_id=${res.id}`;
    }
  }

  private parentSubmissionId(): number | null {
    const raw = this.route.snapshot.queryParamMap.get('parent_submission_id');
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  }

  private applyMessagePlaceholders(message: string, level: 'success' | 'warning' | 'error', res: any): string {
    const abnormalities: any[] = Array.isArray(res?.abnormalities) ? res.abnormalities : [];
    const errors = abnormalities.filter(a => a?.level === 'error');
    const warnings = abnormalities.filter(a => a?.level === 'warning');
    const formatQuestion = (a: any) => a?.label || a?.key || 'Question';
    const formatAnswer = (a: any) => `${formatQuestion(a)}: ${this.valueToText(a?.actual_value)}`;

    return (message || '')
      .replaceAll('{{outcome}}', level)
      .replaceAll('{{submission_id}}', String(res?.id ?? ''))
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
}
