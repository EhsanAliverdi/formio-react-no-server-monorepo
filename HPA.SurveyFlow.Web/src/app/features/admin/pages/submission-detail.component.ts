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
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SubmissionService } from '../../../core/services/submission.service';
import { PdfTemplateService } from '../../../core/services/pdf-template.service';
import { AdminSubmission, AbnormalityItem } from '../../../core/models';
import { buildSubmissionPdfBody } from '../../../core/utils/submission-pdf';
import { patchSchemaUrls } from '../../../core/utils/schema-patch';
import { Formio } from 'formiojs';
import { take } from 'rxjs/operators';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';

type SecondarySubmitOutcome = 'success' | 'warning' | 'error';
type SecondarySubmitAction = {
  outcome: SecondarySubmitOutcome;
  label: string;
  integration: string;
  action: string;
  enabled: boolean;
  disabledReason?: string;
};

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
  selector: 'app-submission-detail',
  standalone: true,
  imports: [CommonModule, HelpTriggerComponent],
  template: `
    <div>

      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <button type="button" (click)="router.navigate(['/admin/submissions'])"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1 class="flex items-center gap-1 text-2xl font-bold text-gray-900 dark:text-white">
          {{ loading() ? 'Submission' : (detail() ? 'Submission #' + detail()!.id + ' — ' + detail()!.form_name : 'Submission') }}
          <app-help-trigger helpKey="admin.submission.detail" label="Help for submission detail" />
        </h1>
        <!-- Action buttons -->
        @if (detail()) {
          <div class="ml-auto flex items-center gap-2">
            @if (!editMode()) {
              <div class="ta-btn-group">
                <button type="button" (click)="exportPdf()" [disabled]="pdfExporting()" class="ta-btn-group-action">
                  @if (pdfExporting()) {
                    <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    Exporting…
                  } @else {
                    ⬇ Export PDF
                  }
                </button>
                <app-help-trigger helpKey="admin.submission.export-pdf" label="Help for exporting submission PDF" [grouped]="true" />
              </div>
              <div class="ta-btn-group">
                <button type="button" (click)="enterEditMode()" class="ta-btn-group-action">✏ Edit</button>
                <app-help-trigger helpKey="admin.submission.edit" label="Help for editing submission answers" [grouped]="true" />
              </div>
            } @else {
              <button type="button" (click)="exitEditMode()" [disabled]="editSaving()"
                class="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 transition">
                Cancel
              </button>
            }
          </div>
        }
      </div>

      @if (loading()) {
        <div class="flex justify-center py-16">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (loadError()) {
        <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ loadError() }}</div>
      } @else if (detail() != null) {

        <div class="space-y-5">

          <!-- Meta card -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div class="flex items-center gap-1 text-xs text-gray-500 mb-0.5">Submitted <app-help-trigger helpKey="admin.submission.metadata" label="Help for submission metadata" /></div>
                <div class="text-gray-800 font-medium">{{ formatDate(detail()!.submitted_at) }}</div>
              </div>
              <div>
                <div class="flex items-center gap-1 text-xs text-gray-500 mb-0.5">By <app-help-trigger helpKey="admin.submission.metadata" label="Help for submission author" /></div>
                <div class="text-gray-800 font-medium">{{ detail()!.user_email ?? 'Anonymous' }}</div>
              </div>
              <div>
                <div class="flex items-center gap-1 text-xs text-gray-500 mb-0.5">Last updated <app-help-trigger helpKey="admin.submission.metadata" label="Help for submission update time" /></div>
                <div class="text-gray-800 font-medium">{{ detail()!.updated_at ? formatDate(detail()!.updated_at) : '—' }}</div>
              </div>
              <div>
                <div class="flex items-center gap-1 text-xs text-gray-500 mb-0.5">Updated by <app-help-trigger helpKey="admin.submission.metadata" label="Help for submission editor" /></div>
                <div class="text-gray-800 font-medium">{{ detail()!.updated_by_email ?? '—' }}</div>
              </div>
            </div>
          </div>

          <!-- Abnormality banners -->
          @if (errorsOf(detail()!).length) {
            <div class="rounded-xl border border-red-200 bg-red-50 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
                  {{ errorsOf(detail()!).length }} Error{{ errorsOf(detail()!).length !== 1 ? 's' : '' }}
                </span>
                <span class="flex items-center gap-1 text-sm font-semibold text-red-800">Abnormal answers detected <app-help-trigger helpKey="admin.submission.abnormalities" label="Help for detected abnormalities" /></span>
              </div>
              <ul class="list-disc pl-5 space-y-0.5 text-sm text-red-700">
                @for (a of errorsOf(detail()!); track a.key) {
                  <li><strong>{{ a.label || a.key }}</strong></li>
                }
              </ul>
            </div>
          }
          @if (warningsOf(detail()!).length) {
            <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  {{ warningsOf(detail()!).length }} Warning{{ warningsOf(detail()!).length !== 1 ? 's' : '' }}
                </span>
                <span class="flex items-center gap-1 text-sm font-semibold text-amber-800">Abnormal answers detected <app-help-trigger helpKey="admin.submission.abnormalities" label="Help for detected abnormalities" /></span>
              </div>
              <ul class="list-disc pl-5 space-y-0.5 text-sm text-amber-700">
                @for (a of warningsOf(detail()!); track a.key) {
                  <li><strong>{{ a.label || a.key }}</strong></li>
                }
              </ul>
            </div>
          }

          <!-- Integration / Secondary Submit card -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="flex items-center gap-1 text-sm font-semibold text-gray-700">
                Integration Submit
                <app-help-trigger helpKey="admin.submission.integration-submit" label="Help for integration submit" />
              </h2>
            </div>

            @if (currentSecondarySubmitAction(); as item) {
              <div class="mb-4 flex flex-wrap gap-2">
                <div class="ta-btn-group">
                  <button type="button" (click)="triggerSecondarySubmit(item.outcome)"
                    [disabled]="!item.enabled || secondarySubmittingOutcome() !== null || detail()!.secondary_submit_status === 'pending'"
                    class="ta-btn-group-action">
                    @if (secondarySubmittingOutcome() === item.outcome) {
                      <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      Sending...
                    } @else if (!item.enabled) {
                      {{ item.disabledReason }}
                    } @else {
                      Send {{ item.label }} to {{ integrationLabel(item.integration) }}
                    }
                  </button>
                  <app-help-trigger helpKey="admin.submission.integration-submit" label="Help for manually submitting to an integration" [grouped]="true" />
                </div>
              </div>
            } @else {
              <button type="button" disabled
                class="mb-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-gray-50 text-gray-500 opacity-75">
                Secondary submit needs to be enabled at form level
              </button>
            }

            @if (!detail()!.secondary_submit_status) {
              <p class="text-sm text-gray-500">No integration submission yet.</p>
            } @else {
              <div class="rounded-lg border p-3 text-sm"
                [class]="detail()!.secondary_submit_status === 'success'
                  ? 'border-green-200 bg-green-50'
                  : detail()!.secondary_submit_status === 'pending'
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-red-200 bg-red-50'">
                <div class="flex items-center gap-3 mb-1">
                  <span class="font-semibold text-base"
                    [class]="detail()!.secondary_submit_status === 'success' ? 'text-green-800'
                      : detail()!.secondary_submit_status === 'pending' ? 'text-blue-800'
                      : 'text-red-800'">
                    {{ detail()!.secondary_submit_status === 'success' ? '✓ Success'
                       : detail()!.secondary_submit_status === 'pending' ? '⏳ In Progress…'
                       : '✗ Failed' }}
                  </span>
                  @if (detail()!.secondary_submit_at) {
                    <span class="text-xs text-gray-500">{{ formatDate(detail()!.secondary_submit_at) }}</span>
                  }
                </div>
                @if (detail()!.secondary_submit_response) {
                  @if (latestIntegrationLog(); as log) {
                    <div class="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div>
                        <div class="text-xs font-semibold text-gray-600 mb-1">Last request sent</div>
                        <pre class="overflow-x-auto rounded bg-white border border-gray-200 p-3 text-xs text-gray-700 whitespace-pre-wrap">{{ formatJson(log.request) }}</pre>
                      </div>
                      <div>
                        <div class="text-xs font-semibold text-gray-600 mb-1">Last response received</div>
                        <pre class="overflow-x-auto rounded bg-white border border-gray-200 p-3 text-xs text-gray-700 whitespace-pre-wrap">{{ formatJson(log.response) }}</pre>
                      </div>
                    </div>
                    <details class="mt-2">
                      <summary class="cursor-pointer text-xs text-gray-600 hover:text-gray-900 select-none">Show full integration log</summary>
                      <pre class="mt-2 overflow-x-auto rounded bg-white border border-gray-200 p-3 text-xs text-gray-700 whitespace-pre-wrap">{{ formatJson(detail()!.secondary_submit_response) }}</pre>
                    </details>
                  }
                }
              </div>
            }
          </div>

          <!-- Rule Activity card -->
          @if ((detail()!.rule_logs?.length ?? 0) > 0) {
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 class="flex items-center gap-1 text-sm font-semibold text-gray-700 mb-4">
                Rule Activity
                <app-help-trigger helpKey="admin.submission.rule-activity" label="Help for rule activity" />
              </h2>
              <div class="space-y-3">
                @for (log of detail()!.rule_logs!; track log.id) {
                  <div class="rounded-lg border p-3 text-sm"
                    [class]="log.status === 'success' ? 'border-green-200 bg-green-50'
                      : log.status === 'pending' ? 'border-blue-200 bg-blue-50'
                      : 'border-red-200 bg-red-50'">

                    <!-- Header row -->
                    <div class="flex flex-wrap items-center gap-2 mb-1">
                      <!-- Type icon -->
                      @if (log.rule_type === 'notification') {
                        <svg class="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                        </svg>
                      } @else {
                        <svg class="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                      }

                      <!-- Rule name -->
                      <span class="font-semibold text-gray-900">{{ log.rule_name }}</span>

                      <!-- Channel badge -->
                      <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        [class]="log.channel === 'mex' ? 'bg-orange-100 text-orange-800'
                          : log.channel === 'webhook' ? 'bg-blue-100 text-blue-800'
                          : log.channel === 'sms' ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-purple-100 text-purple-800'">
                        {{ log.channel | uppercase }}
                      </span>

                      <!-- Status badge -->
                      <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                        [class]="log.status === 'success' ? 'bg-green-100 text-green-800'
                          : log.status === 'pending' ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-800'">
                        {{ log.status === 'success' ? '✓ Success' : log.status === 'pending' ? '⏳ Pending' : '✗ Failed' }}
                      </span>

                      @if (log.status_code) {
                        <span class="text-xs text-gray-500">HTTP {{ log.status_code }}</span>
                      }

                      <span class="ml-auto text-xs text-gray-400">{{ formatDate(log.triggered_at) }}</span>
                    </div>

                    <!-- Action label -->
                    @if (log.action) {
                      <div class="text-xs text-gray-500 mb-1 font-mono">{{ log.action }}</div>
                    }

                    <!-- Error message -->
                    @if (log.error_message) {
                      <div class="mt-1 text-xs text-red-700 bg-red-100 rounded px-2 py-1">{{ log.error_message }}</div>
                    }

                    <!-- Expandable request/response -->
                    @if (log.request_json || log.response_json) {
                      <details class="mt-2">
                        <summary class="cursor-pointer text-xs text-gray-500 hover:text-gray-800 select-none">Show details</summary>
                        <div class="mt-2 grid grid-cols-1 lg:grid-cols-2 gap-2">
                          @if (log.request_json) {
                            <div>
                              <div class="text-xs font-semibold text-gray-600 mb-1">Request</div>
                              <pre class="overflow-x-auto rounded bg-white border border-gray-200 p-2 text-xs text-gray-700 whitespace-pre-wrap">{{ tryFormatJson(log.request_json) }}</pre>
                            </div>
                          }
                          @if (log.response_json) {
                            <div>
                              <div class="text-xs font-semibold text-gray-600 mb-1">Response</div>
                              <pre class="overflow-x-auto rounded bg-white border border-gray-200 p-2 text-xs text-gray-700 whitespace-pre-wrap">{{ tryFormatJson(log.response_json) }}</pre>
                            </div>
                          }
                        </div>
                      </details>
                    }
                  </div>
                }
              </div>
            </div>
          }

          <!-- Form answers card -->
          @if (detail()!.form) {
            <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
              <h2 class="flex items-center gap-1 text-sm font-semibold text-gray-700 mb-4">
                {{ editMode() ? 'Edit Answers' : 'Submitted Answers' }}
                <app-help-trigger [helpKey]="editMode() ? 'admin.submission.edit' : 'admin.submission.answers'" label="Help for submission answers" />
              </h2>

              @if (editError()) {
                <div class="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ editError() }}</div>
              }

              @if (!editMode()) {
                @if (isWizard() && panels().length > 1) {
                  <div class="mb-4 flex flex-wrap gap-2">
                    @for (panel of panels(); track panel.key; let i = $index) {
                      <button type="button"
                        (click)="goToStep(i)"
                        class="inline-flex items-center rounded-full border px-3 py-1 text-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                        [class]="step() === i
                          ? 'border-blue-200 bg-blue-50 font-semibold text-blue-700'
                          : i < step()
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-500'">
                        {{ i + 1 }}. {{ panelTitle(panel, i) }}
                      </button>
                    }
                  </div>
                }

                <div class="formio-scope" [class.flowbite-stepper-wizard]="isWizard()">
                  <div #viewFormContainer></div>
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
              } @else {
                @if (isWizard() && panels().length > 1) {
                  <div class="mb-4 flex flex-wrap gap-2">
                    @for (panel of panels(); track panel.key; let i = $index) {
                      <button type="button"
                        (click)="goToStep(i)"
                        [disabled]="editSaving()"
                        class="inline-flex items-center rounded-full border px-3 py-1 text-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-50"
                        [class]="step() === i
                          ? 'border-blue-200 bg-blue-50 font-semibold text-blue-700'
                          : i < step()
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-500'">
                        {{ i + 1 }}. {{ panelTitle(panel, i) }}
                      </button>
                    }
                  </div>
                }

                <div class="formio-scope" [class.flowbite-stepper-wizard]="isWizard()" [class.opacity-60]="editSaving()">
                  <div #editFormContainer></div>
                </div>

                <div class="mt-4 flex items-center gap-3">
                  @if (isWizard() && step() > 0) {
                    <button type="button" (click)="prevStep()" [disabled]="editSaving()"
                      class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition disabled:opacity-50">
                      Previous
                    </button>
                  }
                  <div class="flex-1"></div>
                  @if (isWizard() && step() < panels().length - 1) {
                    <button type="button" (click)="nextStep()" [disabled]="editSaving()"
                      class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50">
                      Next
                    </button>
                  } @else {
                    <button type="button" (click)="submitEditForm()" [disabled]="editSaving()"
                      class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50">
                      @if (editSaving()) { Saving… } @else { Save Changes }
                    </button>
                  }
                </div>
              }

              @if (editMode()) {
                <div class="mt-4 flex items-center gap-3 border-t pt-4">
                  <p class="text-xs text-gray-500 flex-1">Changes are saved to the submission record with full edit history.</p>
                  <button type="button" (click)="exitEditMode()" [disabled]="editSaving()"
                    class="px-4 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 transition">
                    Cancel
                  </button>
                </div>
              }
            </div>
          }

        </div>
      }
    </div>
  `,
})
export class SubmissionDetailComponent implements OnInit, OnDestroy {
  @ViewChild('viewFormContainer', { static: false }) viewContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('editFormContainer', { static: false }) editContainerRef!: ElementRef<HTMLDivElement>;

  router = inject(Router);
  private route = inject(ActivatedRoute);
  private submissionService = inject(SubmissionService);
  private pdfTemplate = inject(PdfTemplateService);
  private toastr = inject(ToastrService);
  private zone = inject(NgZone);

  loading = signal(true);
  loadError = signal<string | null>(null);
  detail = signal<AdminSubmission | null>(null);

  editMode = signal(false);
  editSaving = signal(false);
  editError = signal<string | null>(null);
  step = signal(0);

  pdfExporting = signal(false);
  secondarySubmittingOutcome = signal<SecondarySubmitOutcome | null>(null);

  viewSchema = computed(() => {
    const form = this.detail()?.form;
    return form ? patchSchemaUrls(form, (window as any).__SURVEYFLOW_API_BASE__ ?? '') : null;
  });
  panels = computed<Panel[]>(() => getPanels(this.viewSchema()));
  isWizard = computed(() => this.viewSchema()?.display === 'wizard' || this.panels().length > 0);
  panelTitle = panelTitle;

  currentSecondarySubmitAction = computed<SecondarySubmitAction | null>(() => {
    const d = this.detail();
    const outcome = this.currentSecondarySubmitOutcome();
    const label = this.outcomeLabel(outcome);
    const config = d?.form?.appSettings?.secondarySubmit;
    if (!config) {
      return {
        outcome,
        label,
        integration: 'mex',
        action: 'create_request',
        enabled: false,
        disabledReason: 'Secondary submit needs to be enabled at form level',
      };
    }

    const hasOutcomeConfig = ['success', 'warning', 'error'].some((item) => config?.[item]);
    if (!hasOutcomeConfig) {
      return {
        outcome,
        label,
        integration: config.integration || 'mex',
        action: config.action || 'create_request',
        enabled: !!config.enabled,
        disabledReason: `${label} secondary submit needs to be enabled at form level`,
      };
    }

    const currentConfig = config[outcome];
    return {
      outcome,
      label,
      integration: currentConfig?.integration || 'mex',
      action: currentConfig?.action || 'create_request',
      enabled: !!currentConfig?.enabled,
      disabledReason: `${label} secondary submit needs to be enabled at form level`,
    };
  });

  latestIntegrationLog = computed(() => {
    const raw = this.detail()?.secondary_submit_response;
    if (!raw) return null;

    const result = raw?.result ?? raw;
    const request = result?.sent_payload ?? result?.request ?? raw?.request ?? null;
    const response = result?.body !== undefined || result?.status_code !== undefined || result?.success !== undefined || result?.error !== undefined
      ? {
          status_code: result?.status_code,
          success: result?.success,
          body: result?.body,
          error: result?.error ?? raw?.error,
        }
      : result;

    return {
      request: request ?? 'No request payload was recorded.',
      response: response ?? 'No response was recorded.',
    };
  });

  private submissionId!: number;
  private viewFormInstance: any = null;
  private editFormInstance: any = null;
  private pendingEditData: any = null;

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) { this.loadError.set('No submission ID.'); this.loading.set(false); return; }
    this.submissionId = +idStr;
    this.loadDetail();
  }

  ngOnDestroy(): void {
    this.destroyViewForm();
    this.destroyEditForm();
  }

  private loadDetail(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.submissionService.getAdmin(this.submissionId).subscribe({
      next: (sub) => {
        this.detail.set(sub);
        this.step.set(0);
        this.loading.set(false);
        this.scheduleViewMount();
      },
      error: (err) => { this.loadError.set(err?.error?.error || 'Failed to load submission.'); this.loading.set(false); },
    });
  }

  saveEdit(data: any): void {
    this.editSaving.set(true);
    this.editError.set(null);
    this.submissionService.updateAdmin(this.submissionId, { data }).subscribe({
      next: () => {
        this.editSaving.set(false);
        this.exitEditMode();
        this.toastr.success('Submission updatedetail()!.');
        this.loadDetail();
      },
      error: (err) => {
        this.editSaving.set(false);
        this.editError.set(err?.error?.error || 'Failed to save changes.');
        this.toastr.error(this.editError()!);
      },
    });
  }

  exportPdf(): void {
    const d = this.detail();
    if (!d || this.pdfExporting()) return;
    this.pdfExporting.set(true);
    const body = buildSubmissionPdfBody(d as unknown as Record<string, unknown>);
    this.pdfTemplate.wrap(body, { title: d.form_name, subtitle: `Submission #${d.id}` }).subscribe((html) => {
      this.submissionService.exportAdminPdf(html, `submission-${d.id}.pdf`).subscribe({
        next: (blob) => {
          this.pdfExporting.set(false);
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `submission-${d.id}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (err) => {
          this.pdfExporting.set(false);
          this.toastr.error(err?.error?.error || 'PDF export failed.');
        },
      });
    });
  }

  triggerSecondarySubmit(outcome: SecondarySubmitOutcome): void {
    if (this.secondarySubmittingOutcome()) return;
    this.secondarySubmittingOutcome.set(outcome);
    this.submissionService.triggerSecondarySubmit(this.submissionId, outcome).subscribe({
      next: (res) => {
        this.secondarySubmittingOutcome.set(null);
        this.toastr.success(res.message || 'Integration submit triggeredetail()!.');
        this.loadDetail();
      },
      error: (err) => {
        this.secondarySubmittingOutcome.set(null);
        this.toastr.error(err?.error?.error || 'Failed to trigger integration submit.');
      },
    });
  }

  currentSecondarySubmitOutcome(): SecondarySubmitOutcome {
    const d = this.detail();
    if (!d) return 'success';
    if ((d.error_count ?? 0) > 0) return 'error';
    if ((d.warning_count ?? 0) > 0) return 'warning';
    return 'success';
  }

  private outcomeLabel(outcome: SecondarySubmitOutcome): string {
    return outcome.charAt(0).toUpperCase() + outcome.slice(1);
  }

  integrationLabel(integration: string): string {
    return integration === 'mex' ? 'MEX' : integration;
  }

  errorsOf(d: AdminSubmission): AbnormalityItem[] {
    return (d.abnormalities ?? []).filter(a => a.level === 'error');
  }

  warningsOf(d: AdminSubmission): AbnormalityItem[] {
    return (d.abnormalities ?? []).filter(a => a.level === 'warning');
  }

  formatJson(value: any): string {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    try { return JSON.stringify(value, null, 2); } catch { return String(value); }
  }

  tryFormatJson(value: string | null | undefined): string {
    if (!value) return '';
    try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
  }

  enterEditMode(): void {
    this.editMode.set(true);
    this.pendingEditData = structuredClone(this.detail()?.data ?? {});
    this.destroyViewForm();
    this.scheduleEditMount();
  }

  exitEditMode(): void {
    this.editMode.set(false);
    this.pendingEditData = null;
    this.destroyEditForm();
    this.scheduleViewMount();
  }

  nextStep(): void {
    if (this.editMode()) {
      this.editFormInstance?.submit();
      return;
    }
    if (this.step() < this.panels().length - 1) {
      this.step.update(s => s + 1);
      this.scheduleViewMount();
    }
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.panels().length || index === this.step()) return;
    if (this.editMode()) {
      this.captureCurrentEditData();
      this.step.set(index);
      this.scheduleEditMount();
      return;
    }
    this.step.set(index);
    this.scheduleViewMount();
  }

  prevStep(): void {
    if (this.editMode()) {
      this.captureCurrentEditData();
      if (this.step() > 0) {
        this.step.update(s => s - 1);
        this.scheduleEditMount();
      }
      return;
    }
    if (this.step() > 0) {
      this.step.update(s => s - 1);
      this.scheduleViewMount();
    }
  }

  submitEditForm(): void {
    if (this.editSaving()) return;
    this.editFormInstance?.submit();
  }

  private scheduleViewMount(): void {
    if (this.editMode() || this.loading() || !this.detail()?.form) return;
    this.zone.onStable.pipe(take(1)).subscribe(() => requestAnimationFrame(() => this.mountViewForm()));
  }

  private scheduleEditMount(): void {
    if (!this.editMode() || this.loading() || !this.detail()?.form) return;
    this.zone.onStable.pipe(take(1)).subscribe(() => requestAnimationFrame(() => this.mountEditForm()));
  }

  private destroyViewForm(): void {
    this.viewFormInstance?.destroy?.(true);
    this.viewFormInstance = null;
    if (this.viewContainerRef?.nativeElement) {
      this.viewContainerRef.nativeElement.innerHTML = '';
    }
  }

  private destroyEditForm(): void {
    this.editFormInstance?.destroy?.(true);
    this.editFormInstance = null;
    if (this.editContainerRef?.nativeElement) {
      this.editContainerRef.nativeElement.innerHTML = '';
    }
  }

  private mountViewForm(): void {
    if (this.editMode()) return;
    if (!this.viewSchema() || !this.viewContainerRef?.nativeElement) {
      requestAnimationFrame(() => this.mountViewForm());
      return;
    }

    this.destroyViewForm();

    const schema = structuredClone(this.viewSchema());
    if (this.isWizard() && this.panels().length > 0) {
      schema.components = [this.panels()[this.step()]];
      schema.display = 'form';
    }

    Formio.createForm(this.viewContainerRef.nativeElement, schema, {
      readOnly: true,
      renderMode: 'html',
      viewAsHtml: true,
      noDefaultSubmitButton: true,
    }).then(async (instance: any) => {
      this.viewFormInstance = instance;
      instance.disabled = true;
      if (this.detail()?.data) {
        await instance.setSubmission({ data: this.detail()!.data }, { fromSubmission: true });
      }
      instance.redraw?.();
    });
  }

  private mountEditForm(): void {
    if (!this.editMode()) return;
    if (!this.viewSchema() || !this.editContainerRef?.nativeElement) {
      requestAnimationFrame(() => this.mountEditForm());
      return;
    }

    this.destroyEditForm();

    const schema = structuredClone(this.viewSchema());
    if (this.isWizard() && this.panels().length > 0) {
      schema.components = [this.panels()[this.step()]];
      schema.display = 'form';
    }

    const isLastStep = !this.isWizard() || this.step() === this.panels().length - 1;

    Formio.createForm(this.editContainerRef.nativeElement, schema, {
      noDefaultSubmitButton: true,
      readOnly: false,
    }).then(async (instance: any) => {
      this.editFormInstance = instance;
      const data = this.pendingEditData ?? this.detail()?.data ?? {};
      await instance.setSubmission({ data }, { fromSubmission: true });
      instance.on('submit', (submission: any) => {
        const nextData = submission?.data ?? submission;
        this.pendingEditData = { ...(this.pendingEditData ?? {}), ...nextData };
        if (isLastStep) {
          this.saveEdit(this.pendingEditData);
        } else {
          this.step.update(s => s + 1);
          this.scheduleEditMount();
        }
      });
      instance.redraw?.();
    });
  }

  private captureCurrentEditData(): void {
    const currentData = this.editFormInstance?.submission?.data;
    if (!currentData) return;
    this.pendingEditData = { ...(this.pendingEditData ?? {}), ...currentData };
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleString(); } catch { return dateStr; }
  }
}
