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
import { AdminSubmission, Form } from '../../../core/models';

const PAGE_SIZE = 25;

@Component({
  selector: 'app-admin-submissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
            <input type="date" [(ngModel)]="fromDateModel"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            <input type="date" [(ngModel)]="toDateModel"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            <select [(ngModel)]="formFilterModel"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All forms</option>
              @for (f of forms(); track f.id) {
                <option [value]="f.id">{{ f.name }}</option>
              }
            </select>
            <input type="search" (input)="onQInput($event)" placeholder="Search…"
              class="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            <button type="button" (click)="loadSubmissions()"
              class="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700 transition">
              Refresh
            </button>
          </div>
        </div>

        @if (error()) {
          <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
        }

        <!-- Table -->
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table class="min-w-full text-sm">
            <thead>
              <tr class="bg-gray-50">
                <th class="px-5 py-3 text-left font-medium text-gray-500">#</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Form</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Abnormal</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Integration</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Submitted</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Submitted By</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              @if (rows().length === 0) {
                <tr>
                  <td colspan="7" class="px-5 py-4 text-sm text-gray-500">
                    {{ loading() ? 'Loading…' : 'No submissions yet.' }}
                  </td>
                </tr>
              } @else {
                @for (r of rows(); track r.id) {
                  <tr class="border-t border-gray-100 hover:bg-gray-50 transition cursor-pointer"
                    (click)="openDetail(r.id)">
                    <td class="px-5 py-4 text-gray-500 text-xs">
                      <div class="flex items-center gap-2">
                        @if ((r.child_submissions?.length ?? 0) > 0) {
                          <button type="button"
                            class="inline-flex h-6 w-6 items-center justify-center rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                            (click)="toggleChildren(r.id); $event.stopPropagation()">
                            {{ childrenExpanded().has(r.id) ? '-' : '+' }}
                          </button>
                        } @else {
                          <span class="inline-block h-6 w-6"></span>
                        }
                        <span>#{{ r.id }}</span>
                      </div>
                    </td>
                    <td class="px-5 py-4 font-medium text-gray-800">{{ r.form_name }}</td>
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
                        <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">✓ Sent</span>
                      } @else {
                        <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">✗ Failed</span>
                      }
                    </td>
                    <td class="px-5 py-4 text-gray-700">{{ formatDate(r.submitted_at) }}</td>
                    <td class="px-5 py-4 text-gray-700">{{ r.user_email ?? 'Anonymous' }}</td>
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
                    <tr class="border-t border-gray-100 bg-indigo-50/30 hover:bg-indigo-50 transition cursor-pointer"
                      (click)="openDetail(child.id)">
                      <td class="px-5 py-3 pl-10 text-gray-500 text-xs">#{{ child.id }}</td>
                      <td class="px-5 py-3">
                        <div class="text-xs font-semibold uppercase tracking-wide text-indigo-600">Sub form</div>
                        <div class="font-medium text-gray-800">{{ child.form_name }}</div>
                      </td>
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
                          <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Sent</span>
                        } @else {
                          <span class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Failed</span>
                        }
                      </td>
                      <td class="px-5 py-3 text-gray-700">{{ formatDate(child.submitted_at) }}</td>
                      <td class="px-5 py-3 text-gray-700">{{ child.user_email ?? 'Anonymous' }}</td>
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
          <div class="text-sm text-gray-600">
            Showing {{ paginationFrom() }}–{{ paginationTo() }} of {{ total() }}
          </div>
          <div class="flex items-center gap-2">
            <button type="button" (click)="prevPage()" [disabled]="page() <= 1 || loading()"
              class="rounded border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50 transition">Prev</button>
            <span class="text-sm text-gray-600">Page {{ page() }} / {{ totalPages() }}</span>
            <button type="button" (click)="nextPage()" [disabled]="page() >= totalPages() || loading()"
              class="rounded border px-3 py-1.5 text-sm disabled:opacity-50 hover:bg-gray-50 transition">Next</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SubmissionsComponent implements OnInit, OnDestroy {
  private submissionService = inject(SubmissionService);
  private formService = inject(FormService);
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

  deleteSubmission(row: AdminSubmission): void {
    const childCount = row.child_submissions?.length ?? 0;
    const suffix = childCount > 0 ? ` and ${childCount} sub form submission(s)` : '';
    if (!window.confirm(`Delete submission #${row.id}${suffix}? This is a soft delete and keeps the audit log.`)) return;

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
}
