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
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap } from 'rxjs/operators';
import { SubmissionService } from '../../../core/services/submission.service';
import { FormService } from '../../../core/services/form.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';
import { AdminSubmission, Form } from '../../../core/models';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-admin-submissions',
  standalone: true,
  imports: [CommonModule, FormsModule, HelpTriggerComponent],
  template: `
    <div>
      <div class="mb-6">
        <h1 class="flex items-center gap-1 text-2xl font-bold text-gray-900 dark:text-white">
          Submissions
          <app-help-trigger helpKey="admin.submissions.list" label="Help for submissions" />
        </h1>
        <p class="text-sm text-gray-500 mt-0.5">Browse and search all form submissions.</p>
      </div>

      <div class="w-full">
        <!-- Filter bar -->
        <div class="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="ta-pagination">
            {{ loading() ? 'Loading…' : total() + ' submission(s)' }}
          </div>
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div class="ta-input-group">
              <input type="date" [(ngModel)]="fromDateModel" aria-label="From date"
                class="ta-input-group-field px-3"/>
              <app-help-trigger helpKey="admin.submissions.date-from" label="Help for from date filter" [inputGrouped]="true" />
            </div>
            <div class="ta-input-group">
              <input type="date" [(ngModel)]="toDateModel" aria-label="To date"
                class="ta-input-group-field px-3"/>
              <app-help-trigger helpKey="admin.submissions.date-to" label="Help for to date filter" [inputGrouped]="true" />
            </div>
            <select [(ngModel)]="formFilterModel" aria-label="Filter by form"
              class="ta-admin-control px-3 py-1.5 text-sm">
              <option value="">All forms</option>
              @for (f of forms(); track f.id) {
                <option [value]="f.id">{{ f.name }}</option>
              }
            </select>
            <div class="ta-input-group">
              <input type="search" (input)="onQInput($event)" placeholder="Search…"
                class="ta-input-group-field"/>
              <app-help-trigger helpKey="admin.submissions.search" label="Help for searching submissions" [inputGrouped]="true" />
            </div>
            <div class="ta-btn-group">
              <button type="button" (click)="loadSubmissions()" class="ta-btn-group-action">Refresh</button>
              <app-help-trigger helpKey="admin.submissions.refresh" label="Help for refreshing submissions" [grouped]="true" />
            </div>
          </div>
        </div>

        @if (error()) {
          <div class="ta-alert-error mb-4">{{ error() }}</div>
        }

        <!-- Table -->
        <div class="ta-table-shell">
          <table class="ta-table min-w-[760px]">
            <thead>
              <tr class="ta-table-head">
                <th scope="col" class="ta-table-th">#</th>
                <th scope="col" class="ta-table-th"><span class="flex items-center gap-1">Form <app-help-trigger helpKey="admin.submissions.form" label="Help for submitted forms" /></span></th>
                <th scope="col" class="ta-table-th">Terminal</th>
                <th scope="col" class="ta-table-th"><span class="flex items-center gap-1">Abnormal <app-help-trigger helpKey="admin.submissions.abnormal" label="Help for abnormal answers" /></span></th>
                <th scope="col" class="ta-table-th"><span class="flex items-center gap-1">Integration <app-help-trigger helpKey="admin.submissions.integration" label="Help for integration status" /></span></th>
                <th scope="col" class="ta-table-th"><span class="flex items-center gap-1">Submitted <app-help-trigger helpKey="admin.submissions.submitted" label="Help for submitted time" /></span></th>
                <th scope="col" class="ta-table-th"><span class="flex items-center gap-1">Submitted By <app-help-trigger helpKey="admin.submissions.submitted-by" label="Help for submitted by" /></span></th>
                <th scope="col" class="ta-table-th"><span class="flex items-center gap-1">Actions <app-help-trigger helpKey="admin.submissions.actions" label="Help for submission actions" /></span></th>
              </tr>
            </thead>
            <tbody>
              @if (rows().length === 0) {
                <tr>
                  <td colspan="8" class="px-5 py-4 text-sm text-gray-500">
                    {{ loading() ? 'Loading…' : 'No submissions yet.' }}
                  </td>
                </tr>
              } @else {
                @for (r of rows(); track r.id) {
                  <tr class="ta-table-row">
                    <td class="px-5 py-4 text-gray-500 text-xs">
                      <div class="flex items-center gap-2">
                        @if ((r.child_submissions?.length ?? 0) > 0) {
                          <button type="button"
                            class="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            (click)="toggleChildren(r.id); $event.stopPropagation()">
                            {{ childrenExpanded().has(r.id) ? '-' : '+' }}
                          </button>
                        } @else {
                          <span class="inline-block h-6 w-6"></span>
                        }
                        <span>#{{ r.id }}</span>
                      </div>
                    </td>
                    <td class="px-5 py-4 font-medium text-gray-800 dark:text-gray-100">{{ r.form_name }}</td>
                    <td class="px-5 py-4 text-gray-700 dark:text-gray-200">{{ terminalLabel(r.terminal_code) }}</td>
                    <td class="px-5 py-4">
                      <div class="flex flex-wrap gap-1">
                        @if (r.error_count > 0) {
                          <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                            {{ r.error_count }} Error{{ r.error_count !== 1 ? 's' : '' }}
                          </span>
                        }
                        @if (r.warning_count > 0) {
                          <span class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            {{ r.warning_count }} Warning{{ r.warning_count !== 1 ? 's' : '' }}
                          </span>
                        }
                        @if (!r.error_count && !r.warning_count) {
                          <span class="text-gray-400">—</span>
                        }
                      </div>
                    </td>
                    <td class="px-5 py-4">
                      @if (!r.secondary_submit_status) {
                        <span class="text-gray-400 text-xs">—</span>
                      } @else if (r.secondary_submit_status === 'pending') {
                        <span class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                          <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                          Pending
                        </span>
                      } @else if (r.secondary_submit_status === 'success') {
                        <span class="inline-flex flex-col items-start rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <span>✓ Sent</span>
                          @if (r.secondary_submit_ref) { <span class="font-bold">#{{ r.secondary_submit_ref }}</span> }
                        </span>
                      } @else {
                        <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">✗ Failed</span>
                      }
                    </td>
                    <td class="px-5 py-4 text-gray-700 dark:text-gray-200">{{ formatDate(r.submitted_at) }}</td>
                    <td class="px-5 py-4 text-gray-700 dark:text-gray-200">{{ r.user_email ?? 'Anonymous' }}</td>
                    <td class="px-5 py-4" (click)="$event.stopPropagation()">
                      <button type="button"
                        class="rounded bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 transition"
                        (click)="openDetail(r.id)">
                        View
                      </button>
                      <button type="button"
                        class="ml-2 rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                        (click)="deleteSubmission(r)">
                        Delete
                      </button>
                    </td>
                  </tr>
                  @if (childrenExpanded().has(r.id)) {
                  @for (child of r.child_submissions ?? []; track child.id) {
                    <tr class="border-t border-gray-100 bg-indigo-50/30 hover:bg-indigo-50 transition dark:border-gray-700 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40">
                      <td class="px-5 py-3 pl-10 text-gray-500 text-xs">#{{ child.id }}</td>
                      <td class="px-5 py-3">
                        <div class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Sub form</div>
                        <div class="font-medium text-gray-800 dark:text-gray-100">{{ child.form_name }}</div>
                      </td>
                      <td class="px-5 py-3 text-gray-700 dark:text-gray-200">{{ terminalLabel(child.terminal_code) }}</td>
                      <td class="px-5 py-3">
                        <div class="flex flex-wrap gap-1">
                          @if (child.error_count > 0) {
                            <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                              {{ child.error_count }} Error{{ child.error_count !== 1 ? 's' : '' }}
                            </span>
                          }
                          @if (child.warning_count > 0) {
                            <span class="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                              {{ child.warning_count }} Warning{{ child.warning_count !== 1 ? 's' : '' }}
                            </span>
                          }
                          @if (!child.error_count && !child.warning_count) {
                            <span class="text-gray-400">—</span>
                          }
                        </div>
                      </td>
                      <td class="px-5 py-3">
                        @if (!child.secondary_submit_status) {
                          <span class="text-gray-400 text-xs">—</span>
                        } @else if (child.secondary_submit_status === 'pending') {
                          <span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">Pending</span>
                        } @else if (child.secondary_submit_status === 'success') {
                          <span class="inline-flex flex-col items-start rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            <span>✓ Sent</span>
                            @if (child.secondary_submit_ref) { <span class="font-bold">#{{ child.secondary_submit_ref }}</span> }
                          </span>
                        } @else {
                          <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Failed</span>
                        }
                      </td>
                      <td class="px-5 py-3 text-gray-700 dark:text-gray-200">{{ formatDate(child.submitted_at) }}</td>
                      <td class="px-5 py-3 text-gray-700 dark:text-gray-200">{{ child.user_email ?? 'Anonymous' }}</td>
                      <td class="px-5 py-3" (click)="$event.stopPropagation()">
                        <button type="button"
                          class="rounded bg-indigo-600 px-3 py-1.5 text-xs text-white hover:bg-indigo-700 transition"
                          (click)="openDetail(child.id)">
                          View
                        </button>
                      </td>
                    </tr>
                  }
                  }
                }
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="mt-4 flex items-center justify-between">
          <div class="ta-pagination flex items-center gap-1">
            Showing {{ paginationFrom() }}–{{ paginationTo() }} of {{ total() }}
            <app-help-trigger helpKey="admin.submissions.pagination" label="Help for submission pagination" />
          </div>
          <div class="flex items-center gap-2">
            <button type="button" (click)="prevPage()" [disabled]="page() <= 1 || loading()"
              class="ta-btn ta-btn-secondary px-3 py-1.5">Prev</button>
            <span class="ta-pagination">Page {{ page() }} / {{ totalPages() }}</span>
            <button type="button" (click)="nextPage()" [disabled]="page() >= totalPages() || loading()"
              class="ta-btn ta-btn-secondary px-3 py-1.5">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SubmissionsComponent implements OnInit, OnDestroy {
  private submissionService = inject(SubmissionService);
  private formService = inject(FormService);
  private confirm = inject(ConfirmDialogService);
  private router = inject(Router);

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
  childrenExpanded = signal<Set<number>>(new Set());

  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  paginationFrom = computed(() => this.total() === 0 ? 0 : (this.page() - 1) * PAGE_SIZE + 1);
  paginationTo = computed(() => Math.min(this.total(), (this.page() - 1) * PAGE_SIZE + this.rows().length));

  private searchSubject = new Subject<string>();
  private subs: Subscription[] = [];

  get fromDateModel(): string { return this.fromDate(); }
  set fromDateModel(val: string) { this.fromDate.set(val); this.page.set(1); this.loadSubmissions(); }

  get toDateModel(): string { return this.toDate(); }
  set toDateModel(val: string) { this.toDate.set(val); this.page.set(1); this.loadSubmissions(); }

  get formFilterModel(): string { return this.formFilter() !== null ? String(this.formFilter()) : ''; }
  set formFilterModel(val: string) { this.formFilter.set(val ? Number(val) : null); this.page.set(1); this.loadSubmissions(); }

  ngOnInit(): void {
    this.loadForms();
    this.loadSubmissions();

    const sub = this.searchSubject.pipe(
      debounceTime(300),
      switchMap((val) => {
        this.q.set(val);
        this.page.set(1);
        this.loading.set(true);
        return this.submissionService.listAdmin(this.buildParams());
      })
    ).subscribe({
      next: (result) => { this.rows.set(result.items); this.total.set(result.total ?? 0); this.loading.set(false); this.error.set(null); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.error || 'Failed to load submissions.'); },
    });
    this.subs.push(sub);
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  private loadForms(): void {
    this.formService.list().subscribe({
      next: (forms: Form[]) => this.forms.set(forms.map(f => ({ id: f.id, name: f.name }))),
      error: () => {},
    });
  }

  private buildParams(): Record<string, any> {
    const params: Record<string, any> = { limit: PAGE_SIZE, offset: (this.page() - 1) * PAGE_SIZE };
    const q = this.q(); if (q) params['q'] = q;
    const formId = this.formFilter(); if (formId !== null) params['form_id'] = formId;
    const from = this.fromDate(); if (from) params['from'] = from;
    const to = this.toDate(); if (to) params['to'] = to;
    return params;
  }

  loadSubmissions(): void {
    this.loading.set(true);
    this.error.set(null);
    this.submissionService.listAdmin(this.buildParams()).subscribe({
      next: (result) => { this.rows.set(result.items); this.total.set(result.total ?? 0); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.error || 'Failed to load submissions.'); },
    });
  }

  openDetail(id: number): void {
    this.router.navigate(['/admin/submissions', id]);
  }

  toggleChildren(id: number): void {
    const next = new Set(this.childrenExpanded());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.childrenExpanded.set(next);
  }

  async deleteSubmission(row: AdminSubmission): Promise<void> {
    const childCount = row.child_submissions?.length ?? 0;
    const suffix = childCount > 0 ? ` and ${childCount} sub-form submission(s)` : '';
    const ok = await this.confirm.open({
      title: 'Delete Submission',
      message: `Delete submission #${row.id}${suffix}? This is a soft delete and keeps the audit log.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    this.submissionService.deleteAdmin(row.id).subscribe({
      next: () => this.loadSubmissions(),
      error: (err) => this.error.set(err?.error?.error || 'Failed to delete submission.'),
    });
  }

  onQInput(event: Event): void { this.searchSubject.next((event.target as HTMLInputElement).value); }

  prevPage(): void { if (this.page() <= 1) return; this.page.update(p => p - 1); this.loadSubmissions(); }
  nextPage(): void { if (this.page() >= this.totalPages()) return; this.page.update(p => p + 1); this.loadSubmissions(); }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleString(); } catch { return dateStr; }
  }

  terminalLabel(code?: string | null): string {
    return code?.trim() || 'All';
  }
}
