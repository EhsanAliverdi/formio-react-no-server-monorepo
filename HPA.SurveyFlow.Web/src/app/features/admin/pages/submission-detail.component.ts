import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SubmissionService } from '../../../core/services/submission.service';
import { FormRendererComponent } from '../../../shared/components/formio/form-renderer.component';
import { AdminSubmission, AbnormalityItem } from '../../../core/models';
import { buildSubmissionPdfBody, wrapPdfDocument } from '../../../core/utils/submission-pdf';

@Component({
  selector: 'app-submission-detail',
  standalone: true,
  imports: [CommonModule, FormRendererComponent],
  template: `
    <div class="p-6">

      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <button type="button" (click)="router.navigate(['/admin/submissions'])"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1 class="text-2xl font-bold text-gray-900">
          {{ loading() ? 'Submission' : (detail() ? 'Submission #' + detail()!.id + ' — ' + detail()!.form_name : 'Submission') }}
        </h1>
        <!-- Action buttons -->
        @if (detail()) {
          <div class="ml-auto flex items-center gap-2">
            @if (!editMode()) {
              <button type="button" (click)="exportPdf()" [disabled]="pdfExporting()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 transition">
                @if (pdfExporting()) {
                  <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  Exporting…
                } @else {
                  ⬇ Export PDF
                }
              </button>
              <button type="button" (click)="editMode.set(true)"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition">
                ✏ Edit
              </button>
            } @else {
              <button type="button" (click)="editMode.set(false)" [disabled]="editSaving()"
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
          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div class="text-xs text-gray-500 mb-0.5">Submitted</div>
                <div class="text-gray-800 font-medium">{{ formatDate(detail()!.submitted_at) }}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500 mb-0.5">By</div>
                <div class="text-gray-800 font-medium">{{ detail()!.user_email ?? 'Anonymous' }}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500 mb-0.5">Last updated</div>
                <div class="text-gray-800 font-medium">{{ detail()!.updated_at ? formatDate(detail()!.updated_at) : '—' }}</div>
              </div>
              <div>
                <div class="text-xs text-gray-500 mb-0.5">Updated by</div>
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
                <span class="text-sm font-semibold text-red-800">Abnormal answers detected</span>
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
                <span class="text-sm font-semibold text-amber-800">Abnormal answers detected</span>
              </div>
              <ul class="list-disc pl-5 space-y-0.5 text-sm text-amber-700">
                @for (a of warningsOf(detail()!); track a.key) {
                  <li><strong>{{ a.label || a.key }}</strong></li>
                }
              </ul>
            </div>
          }

          <!-- Integration / Secondary Submit card -->
          <div class="bg-white rounded-xl border border-gray-200 p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="text-sm font-semibold text-gray-700">Integration Submit</h2>
              <button type="button" (click)="triggerSecondarySubmit()"
                [disabled]="secondarySubmitting() || detail()!.secondary_submit_status === 'pending'"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition">
                @if (secondarySubmitting()) {
                  <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  Sending…
                } @else {
                  ↗ Send to Integration
                }
              </button>
            </div>

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
                  <details class="mt-2">
                    <summary class="cursor-pointer text-xs text-gray-600 hover:text-gray-900 select-none">Show full response</summary>
                    <pre class="mt-2 overflow-x-auto rounded bg-white border border-gray-200 p-3 text-xs text-gray-700 whitespace-pre-wrap">{{ formatJson(detail()!.secondary_submit_response) }}</pre>
                  </details>
                }
              </div>
            }
          </div>

          <!-- Form answers card -->
          @if (detail()!.form) {
            <div class="bg-white rounded-xl border border-gray-200 p-5">
              <h2 class="text-sm font-semibold text-gray-700 mb-4">
                {{ editMode() ? 'Edit Answers' : 'Submitted Answers' }}
              </h2>

              @if (editError()) {
                <div class="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ editError() }}</div>
              }

              <div [class.opacity-60]="editSaving()">
                <app-form-renderer
                  [form]="detail()!.form"
                  [submission]="detail()!.data"
                  [readOnly]="!editMode()"
                  (submitted)="saveEdit($event)"
                />
              </div>

              @if (editMode()) {
                <div class="mt-4 flex items-center gap-3 border-t pt-4">
                  <p class="text-xs text-gray-500 flex-1">Changes are saved to the submission record with full edit history.</p>
                  <button type="button" (click)="editMode.set(false)" [disabled]="editSaving()"
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
export class SubmissionDetailComponent implements OnInit {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private submissionService = inject(SubmissionService);
  private toastr = inject(ToastrService);

  loading = signal(true);
  loadError = signal<string | null>(null);
  detail = signal<AdminSubmission | null>(null);

  editMode = signal(false);
  editSaving = signal(false);
  editError = signal<string | null>(null);

  pdfExporting = signal(false);
  secondarySubmitting = signal(false);

  private submissionId!: number;

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) { this.loadError.set('No submission ID.'); this.loading.set(false); return; }
    this.submissionId = +idStr;
    this.loadDetail();
  }

  private loadDetail(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.submissionService.getAdmin(this.submissionId).subscribe({
      next: (sub) => { this.detail.set(sub); this.loading.set(false); },
      error: (err) => { this.loadError.set(err?.error?.error || 'Failed to load submission.'); this.loading.set(false); },
    });
  }

  saveEdit(data: any): void {
    this.editSaving.set(true);
    this.editError.set(null);
    this.submissionService.updateAdmin(this.submissionId, { data }).subscribe({
      next: () => {
        this.editSaving.set(false);
        this.editMode.set(false);
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
    const html = wrapPdfDocument(buildSubmissionPdfBody(d as unknown as Record<string, unknown>));
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
  }

  triggerSecondarySubmit(): void {
    if (this.secondarySubmitting()) return;
    this.secondarySubmitting.set(true);
    this.submissionService.triggerSecondarySubmit(this.submissionId).subscribe({
      next: (res) => {
        this.secondarySubmitting.set(false);
        this.toastr.success(res.message || 'Integration submit triggeredetail()!.');
        this.loadDetail();
      },
      error: (err) => {
        this.secondarySubmitting.set(false);
        this.toastr.error(err?.error?.error || 'Failed to trigger integration submit.');
      },
    });
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

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleString(); } catch { return dateStr; }
  }
}
