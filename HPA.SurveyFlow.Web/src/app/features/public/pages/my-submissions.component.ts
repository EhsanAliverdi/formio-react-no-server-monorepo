import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubmissionService } from '../../../core/services/submission.service';
import { PdfTemplateService } from '../../../core/services/pdf-template.service';
import { buildSubmissionPdfBody } from '../../../core/utils/submission-pdf';
import { FormSubmission } from '../../../core/models';
import { FormRendererComponent } from '../../../shared/components/formio/form-renderer.component';

@Component({
  selector: 'app-my-submissions',
  standalone: true,
  imports: [CommonModule, FormRendererComponent],
  template: `
    <div class="w-full">
      <h2 class="text-xl font-bold mb-6">My submissions</h2>

      @if (error()) {
        <div class="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{{ error() }}</div>
      }
      @if (loading()) {
        <div class="text-gray-500">Loading…</div>
      } @else if (items().length === 0) {
        <div class="text-gray-500">No submissions yet.</div>
      } @else {
        <div class="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-gray-600">
              <tr>
                <th class="px-4 py-3 text-left font-semibold">Submission</th>
                <th class="px-4 py-3 text-left font-semibold">Form</th>
                <th class="px-4 py-3 text-left font-semibold">Submitted</th>
                <th class="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (r of items(); track r.id) {
                <tr class="border-t border-gray-100">
                  <td class="px-4 py-3">#{{ r.id }}</td>
                  <td class="px-4 py-3">{{ r.form_name }}</td>
                  <td class="px-4 py-3">{{ formatDate(r.submitted_at) }}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        class="rounded border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                        (click)="openDetail(r.id)"
                      >View</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Detail Modal -->
      @if (viewId() !== null) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div class="text-xl font-bold mb-2">Submission</div>
            @if (detailLoading()) {
              <div class="text-gray-500">Loading…</div>
            }
            @if (detailError()) {
              <div class="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{{ detailError() }}</div>
            }

            @if (detail(); as d) {
              <div class="mb-4 text-sm text-gray-700">
                <div><span class="font-semibold">Form:</span> {{ d.form_name }}</div>
                <div><span class="font-semibold">Submitted:</span> {{ formatDate(d.submitted_at) }}</div>
              </div>

              @if (d.form) {
                <div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <app-form-renderer [form]="d.form" [submission]="d.data" [readOnly]="true" />
                </div>
              } @else {
                <div class="rounded border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">Form schema not available.</div>
              }

              <div class="pt-4 mt-4 border-t flex items-center justify-end gap-2">
                @if (d.can_export_pdf) {
                  <button
                    class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50"
                    (click)="exportPdf()"
                    [disabled]="exporting()"
                  >
                    {{ exporting() ? 'Exporting…' : 'Export PDF' }}
                  </button>
                }
                <button
                  class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                  (click)="closeDetail()"
                >Close</button>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class MySubmissionsComponent implements OnInit {
  private submissionService = inject(SubmissionService);
  private pdfTemplate = inject(PdfTemplateService);

  items = signal<FormSubmission[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  viewId = signal<number | null>(null);
  detail = signal<FormSubmission | null>(null);
  detailLoading = signal(false);
  detailError = signal<string | null>(null);
  exporting = signal(false);

  constructor() {
    effect(() => {
      const id = this.viewId();
      if (id !== null) {
        this.loadDetail(id);
      } else {
        this.detail.set(null);
        this.detailError.set(null);
      }
    });
  }

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.loading.set(true);
    this.error.set(null);
    this.submissionService.listMine().subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load submissions.');
        this.loading.set(false);
      },
    });
  }

  openDetail(id: number): void {
    this.viewId.set(id);
  }

  closeDetail(): void {
    this.viewId.set(null);
  }

  loadDetail(id: number): void {
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.detail.set(null);
    this.submissionService.get(id).subscribe({
      next: (sub) => {
        this.detail.set(sub);
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailError.set('Failed to load submission details.');
        this.detailLoading.set(false);
      },
    });
  }

  exportPdf(): void {
    const d = this.detail();
    if (!d) return;
    this.exporting.set(true);
    const body = buildSubmissionPdfBody(d as unknown as Record<string, unknown>);
    this.pdfTemplate.wrap(body, { title: d.form_name, subtitle: `Submission #${d.id}` }).subscribe((html) => {
      this.submissionService.exportPdf(d.id, html, `submission-${d.id}.pdf`).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `submission-${d.id}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
          this.exporting.set(false);
        },
        error: () => { this.exporting.set(false); },
      });
    });
  }

  formatDate(s: string): string {
    return new Date(s).toLocaleString();
  }
}
