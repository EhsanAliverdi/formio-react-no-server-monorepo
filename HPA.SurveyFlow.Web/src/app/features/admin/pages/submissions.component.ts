import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { SubmissionService } from '../../../core/services/submission.service';
import { FormService } from '../../../core/services/form.service';
import { ToastrService } from 'ngx-toastr';
import { FormRendererComponent } from '../../../shared/components/formio/form-renderer.component';
import { AdminSubmission, Form } from '../../../core/models';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-admin-submissions',
  standalone: true,
  imports: [CommonModule, FormsModule, FormRendererComponent],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Submissions</h1>
      </div>

      <div class="w-full">
        <!-- Filter bar -->
        <div class="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="text-sm text-gray-600">
            {{ loading() ? 'Loading…' : total() + ' submission(s)' }}
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="date"
              [(ngModel)]="fromDateModel"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="date"
              [(ngModel)]="toDateModel"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              [(ngModel)]="formFilterModel"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All forms</option>
              @for (f of forms(); track f.id) {
                <option [value]="f.id">{{ f.name }}</option>
              }
            </select>
            <input
              type="search"
              (input)="onQInput($event)"
              placeholder="Search..."
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              (click)="loadSubmissions()"
              class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <!-- Error -->
        @if (error()) {
          <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {{ error() }}
          </div>
        }

        <!-- Table -->
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="bg-gray-50">
                <th class="px-5 py-3 text-left font-medium text-gray-500">Form</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Abnormal</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Submitted</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Submitted By</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (rows().length === 0) {
                <tr>
                  <td colspan="5" class="px-5 py-4 text-sm text-gray-500">
                    {{ loading() ? 'Loading…' : 'No submissions yet.' }}
                  </td>
                </tr>
              } @else {
                @for (r of rows(); track r.id) {
                  <tr class="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td class="px-5 py-4">{{ r.form_name }}</td>
                    <td class="px-5 py-4">
                      @if (r.abnormal_count > 0) {
                        <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Yes ({{ r.abnormal_count }})
                        </span>
                      } @else {
                        <span class="text-gray-500">No</span>
                      }
                    </td>
                    <td class="px-5 py-4 text-gray-700">{{ formatDate(r.submitted_at) }}</td>
                    <td class="px-5 py-4 text-gray-700">{{ r.user_email ?? 'Anonymous' }}</td>
                    <td class="px-5 py-4">
                      <button
                        type="button"
                        class="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 transition"
                        (click)="openDetail(r.id)"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="mt-4 flex items-center justify-between">
          <div class="text-sm text-gray-600">
            Showing {{ paginationFrom() }}–{{ paginationTo() }} of {{ total() }}
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="prevPage()"
              [disabled]="page() <= 1 || loading()"
              class="rounded border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50 transition"
            >
              Prev
            </button>
            <span class="text-sm text-gray-600">Page {{ page() }} / {{ totalPages() }}</span>
            <button
              type="button"
              (click)="nextPage()"
              [disabled]="page() >= totalPages() || loading()"
              class="rounded border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50 transition"
            >
              Next
            </button>
          </div>
        </div>

        <!-- Modal overlay -->
        @if (viewId() !== null) {
          <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div class="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
              <div class="flex items-center justify-between border-b pb-4">
                <h3 class="text-lg font-semibold text-gray-900">
                  {{ detail() ? 'Submission: ' + detail()!.form_name : 'View Submission' }}
                </h3>
                <button
                  type="button"
                  (click)="closeDetail()"
                  class="text-gray-500 hover:text-gray-700 text-xl leading-none"
                >
                  ✕
                </button>
              </div>

              <div class="pt-4 space-y-3">
                @if (detailError()) {
                  <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {{ detailError() }}
                  </div>
                }
                @if (detailLoading()) {
                  <div class="flex justify-center py-8">
                    <div class="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }

                @if (detail(); as d) {
                  <div class="rounded-lg border border-gray-200 p-4">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div class="text-xs text-gray-500 mb-0.5">Submitted</div>
                        <div class="text-gray-800">{{ formatDate(d.submitted_at) }}</div>
                      </div>
                      <div>
                        <div class="text-xs text-gray-500 mb-0.5">By</div>
                        <div class="text-gray-800">{{ d.user_email ?? 'Anonymous' }}</div>
                      </div>
                      <div>
                        <div class="text-xs text-gray-500 mb-0.5">Updated</div>
                        <div class="text-gray-800">{{ d.updated_at ? formatDate(d.updated_at) : '—' }}</div>
                      </div>
                      <div>
                        <div class="text-xs text-gray-500 mb-0.5">Updated by</div>
                        <div class="text-gray-800">{{ d.updated_by_email ?? '—' }}</div>
                      </div>
                    </div>

                    @if (d.abnormalities?.length) {
                      <div class="mt-3 rounded border border-red-200 bg-red-50 p-3 text-red-800 text-sm">
                        <div class="font-semibold mb-1">Abnormal answers</div>
                        <ul class="list-disc pl-4 space-y-0.5">
                          @for (a of d.abnormalities!; track a.key) {
                            <li>{{ a.label || a.key }}</li>
                          }
                        </ul>
                      </div>
                    }
                  </div>

                  @if (d.form) {
                    <div class="rounded-lg border border-gray-200 p-4">
                      @if (!editMode()) {
                        <app-form-renderer [form]="d.form" [submission]="d.data" [readOnly]="true" />
                      } @else {
                        <div [class.opacity-60]="editSaving()">
                          <app-form-renderer
                            [form]="d.form"
                            [submission]="d.data"
                            [readOnly]="false"
                            (submitted)="saveEdit($event)"
                          />
                        </div>
                      }
                      @if (editError()) {
                        <div class="mt-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                          {{ editError() }}
                        </div>
                      }
                    </div>
                  }
                }
              </div>

              <div class="mt-4 border-t pt-4 flex items-center justify-end gap-2">
                @if (detail() && !editMode()) {
                  <button
                    type="button"
                    class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    (click)="editMode.set(true)"
                  >
                    Edit
                  </button>
                }
                @if (detail() && editMode()) {
                  <button
                    type="button"
                    class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                    (click)="editMode.set(false)"
                    [disabled]="editSaving()"
                  >
                    Cancel
                  </button>
                }
                <button
                  type="button"
                  class="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  (click)="closeDetail()"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class SubmissionsComponent implements OnInit, OnDestroy {
  private submissionService = inject(SubmissionService);
  private formService = inject(FormService);
  private toastr = inject(ToastrService);

  rows = signal<AdminSubmission[]>([]);
  total = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);

  page = signal(1);
  q = signal('');
  formFilter = signal<number | null>(null);
  fromDate = signal('');
  toDate = signal('');

  forms = signal<{ id: number; name: string }[]>([]);

  viewId = signal<number | null>(null);
  detail = signal<AdminSubmission | null>(null);
  detailLoading = signal(false);
  detailError = signal<string | null>(null);

  editMode = signal(false);
  editSaving = signal(false);
  editError = signal<string | null>(null);

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  paginationFrom = computed(() =>
    this.total() === 0 ? 0 : (this.page() - 1) * PAGE_SIZE + 1
  );
  paginationTo = computed(() =>
    Math.min(this.total(), (this.page() - 1) * PAGE_SIZE + this.rows().length)
  );

  private searchSubject = new Subject<string>();
  private subs: Subscription[] = [];

  // Two-way binding helpers for template ngModel
  get fromDateModel(): string {
    return this.fromDate();
  }
  set fromDateModel(val: string) {
    this.fromDate.set(val);
    this.page.set(1);
    this.loadSubmissions();
  }

  get toDateModel(): string {
    return this.toDate();
  }
  set toDateModel(val: string) {
    this.toDate.set(val);
    this.page.set(1);
    this.loadSubmissions();
  }

  get formFilterModel(): string {
    return this.formFilter() !== null ? String(this.formFilter()) : '';
  }
  set formFilterModel(val: string) {
    this.formFilter.set(val ? Number(val) : null);
    this.page.set(1);
    this.loadSubmissions();
  }

  ngOnInit(): void {
    this.loadForms();
    this.loadSubmissions();

    const sub = this.searchSubject
      .pipe(
        debounceTime(300),
        switchMap((val) => {
          this.q.set(val);
          this.page.set(1);
          this.loading.set(true);
          const params = this.buildParams();
          return this.submissionService.listAdmin(params);
        })
      )
      .subscribe({
        next: (result) => {
          this.rows.set(result.items);
          this.total.set(result.total ?? 0);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.error || 'Failed to load submissions.');
        },
      });
    this.subs.push(sub);
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  private loadForms(): void {
    this.formService.list().subscribe({
      next: (forms: Form[]) => {
        this.forms.set(forms.map((f) => ({ id: f.id, name: f.name })));
      },
      error: () => {},
    });
  }

  private buildParams(): Record<string, any> {
    const params: Record<string, any> = {
      limit: PAGE_SIZE,
      offset: (this.page() - 1) * PAGE_SIZE,
    };
    const q = this.q();
    if (q) params['q'] = q;
    const formId = this.formFilter();
    if (formId !== null) params['form_id'] = formId;
    const from = this.fromDate();
    if (from) params['from'] = from;
    const to = this.toDate();
    if (to) params['to'] = to;
    return params;
  }

  loadSubmissions(): void {
    this.loading.set(true);
    this.error.set(null);
    this.submissionService.listAdmin(this.buildParams()).subscribe({
      next: (result) => {
        this.rows.set(result.items);
        this.total.set(result.total ?? 0);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to load submissions.');
      },
    });
  }

  onQInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchSubject.next(val);
  }

  prevPage(): void {
    if (this.page() <= 1) return;
    this.page.update((p) => p - 1);
    this.loadSubmissions();
  }

  nextPage(): void {
    if (this.page() >= this.totalPages()) return;
    this.page.update((p) => p + 1);
    this.loadSubmissions();
  }

  openDetail(id: number): void {
    this.viewId.set(id);
    this.detail.set(null);
    this.detailLoading.set(true);
    this.detailError.set(null);
    this.editMode.set(false);
    this.editError.set(null);
    this.submissionService.getAdmin(id).subscribe({
      next: (sub) => {
        this.detail.set(sub);
        this.detailLoading.set(false);
      },
      error: (err) => {
        this.detailLoading.set(false);
        this.detailError.set(err?.error?.error || 'Failed to load submission.');
      },
    });
  }

  closeDetail(): void {
    this.viewId.set(null);
    this.detail.set(null);
    this.editMode.set(false);
    this.editError.set(null);
  }

  saveEdit(data: any): void {
    const id = this.viewId();
    if (id === null) return;
    this.editSaving.set(true);
    this.editError.set(null);
    this.submissionService.updateAdmin(id, { data }).subscribe({
      next: () => {
        this.editSaving.set(false);
        this.editMode.set(false);
        this.toastr.success('Submission updated.');
        this.loadSubmissions();
        // Reload detail
        this.submissionService.getAdmin(id).subscribe({
          next: (sub) => this.detail.set(sub),
          error: () => {},
        });
      },
      error: (err) => {
        this.editSaving.set(false);
        this.editError.set(err?.error?.error || 'Failed to save changes.');
        this.toastr.error(this.editError()!);
      },
    });
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  }
}
