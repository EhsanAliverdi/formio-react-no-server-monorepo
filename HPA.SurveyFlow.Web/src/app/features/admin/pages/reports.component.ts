import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportTemplateService } from '../../../core/services/report-template.service';
import { FormService } from '../../../core/services/form.service';
import { Form, ReportTemplate } from '../../../core/models';
import { forkJoin } from 'rxjs';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule, HelpTriggerComponent],
  template: `
    <div>

      <!-- Page header -->
      <div class="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-1">Reports <app-help-trigger helpKey="admin.reports.list" label="Help for reports" /></h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-500">Create and run dynamic reports on your form submissions</p>
        </div>
        @if (forms().length > 0) {
          <div class="flex items-center gap-2 flex-shrink-0">
            <select [(ngModel)]="newReportFormId" aria-label="Select form for new report" class="ta-field text-sm h-10 w-48">
              <option value="">Select a form…</option>
              @for (f of forms(); track f.id) {
                <option [value]="f.id">{{ f.name }}</option>
              }
            </select>
            <div class="ta-btn-group">
              <button type="button" (click)="newReport()" [disabled]="!newReportFormId"
                class="ta-btn-group-action disabled:opacity-50 disabled:cursor-not-allowed">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                New Report
              </button>
              <button type="button" (click)="newIntegrationReport()" [disabled]="!newReportFormId"
                class="ta-btn-group-action disabled:opacity-50 disabled:cursor-not-allowed">
                Integration
              </button>
              <app-help-trigger helpKey="admin.reports.new" label="Help for creating a new report" [grouped]="true" />
            </div>
          </div>
        }
      </div>

      <!-- Error -->
      @if (error()) {
        <div class="ta-alert-error mb-4">{{ error() }}</div>
      }

      <!-- Recently Used section -->
      @if (recentlyUsed().length > 0 && !filterCategory && !searchQuery && !showDriftOnly && !filterFormId) {
        <div class="mb-6">
          <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wide mb-3">Recently Used</h2>
          <div class="flex gap-2 flex-wrap">
            @for (t of recentlyUsedTemplates(); track t.id) {
              <button type="button" (click)="runReport(t)"
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 transition-colors">
                <svg class="w-3.5 h-3.5 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ t.name }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Filter bar -->
      <div class="mb-5 flex flex-wrap items-center gap-3">
        <!-- Form filter -->
        <div class="ta-input-group">
          <select [(ngModel)]="filterFormId" (ngModelChange)="applyFilters()" aria-label="Filter by form" class="ta-input-group-field h-9 px-3 text-sm">
            <option value="">All forms</option>
            @for (f of forms(); track f.id) {
              <option [value]="f.id">{{ f.name }}</option>
            }
          </select>
          <app-help-trigger helpKey="admin.reports.filter-form" label="Help for form filter" [inputGrouped]="true" />
        </div>

        <!-- Category filter -->
        @if (categories().length > 0) {
          <div class="ta-input-group">
            <select [(ngModel)]="filterCategory" (ngModelChange)="applyFilters()" aria-label="Filter by category" class="ta-input-group-field h-9 px-3 text-sm">
              <option value="">All categories</option>
              @for (cat of categories(); track cat) {
                <option [value]="cat">{{ cat }}</option>
              }
            </select>
            <app-help-trigger helpKey="admin.reports.filter-category" label="Help for category filter" [inputGrouped]="true" />
          </div>
        }

        <!-- Search -->
        <div class="ta-input-group flex-1 min-w-36 max-w-64">
          <div class="relative flex-1 flex items-center">
            <svg class="absolute left-3 w-4 h-4 text-gray-500 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="search" [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()"
              placeholder="Search reports…" class="ta-input-group-field h-9 pl-9 pr-3"/>
          </div>
          <app-help-trigger helpKey="admin.reports.search" label="Help for search" [inputGrouped]="true" />
        </div>

        <!-- Drift filter toggle -->
        <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          <input type="checkbox" [(ngModel)]="showDriftOnly" (ngModelChange)="applyFilters()"
            class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"/>
          <span class="flex items-center gap-1">
            <svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            Outdated only
            <app-help-trigger helpKey="admin.reports.drift" label="Help for outdated filter" />
          </span>
        </label>

        <!-- Favourites filter -->
        <label class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer select-none">
          <input type="checkbox" [(ngModel)]="showFavouritesOnly" (ngModelChange)="applyFilters()"
            class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"/>
          <span class="flex items-center gap-1">
            <svg class="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
            </svg>
            Favourites
            <app-help-trigger helpKey="admin.reports.favourites" label="Help for favourites filter" />
          </span>
        </label>

        <span class="text-sm text-gray-500 ml-auto">
          {{ loading() ? 'Loading...' : total() + ' result' + (total() !== 1 ? 's' : '') }}
        </span>
      </div>

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="py-16 text-center text-sm text-gray-400">Loading reports...</div>
      }

      <!-- Empty state -->
      @else if (filteredTemplates().length === 0) {
        <div class="ta-card flex flex-col items-center justify-center py-16 text-center">
          <div class="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
            <svg class="w-7 h-7 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          @if (templates().length === 0) {
            <h3 class="text-base font-semibold text-gray-800 dark:text-white mb-1">No report templates yet</h3>
            <p class="text-sm text-gray-500 mb-6 max-w-xs">Select a form and create your first report template to get started.</p>
            @if (forms().length > 0) {
              <div class="flex items-center gap-2">
                <select [(ngModel)]="newReportFormId" aria-label="Select form for new report" class="ta-field text-sm h-10 w-48">
                  <option value="">Select a form…</option>
                  @for (f of forms(); track f.id) {
                    <option [value]="f.id">{{ f.name }}</option>
                  }
                </select>
                <button type="button" (click)="newReport()" [disabled]="!newReportFormId"
                  class="ta-btn ta-btn-primary h-10 disabled:opacity-50">Create Report</button>
              </div>
            }
          } @else {
            <h3 class="text-base font-semibold text-gray-800 dark:text-white mb-1">No results</h3>
            <p class="text-sm text-gray-500 mb-4">Try adjusting your filters.</p>
            <button type="button" (click)="clearFilters()" class="ta-btn ta-btn-secondary text-sm">Clear filters</button>
          }
        </div>
      }

      <!-- Reports table -->
      @else {
        <div class="ta-table-shell">
          <table class="ta-table min-w-[1040px]">
            <thead>
              <tr class="ta-table-head">
                <th scope="col" class="ta-table-th">Report</th>
                <th scope="col" class="ta-table-th">Form</th>
                <th scope="col" class="ta-table-th">Terminal</th>
                <th scope="col" class="ta-table-th">Category / Tags</th>
                <th scope="col" class="ta-table-th">Columns</th>
                <th scope="col" class="ta-table-th">Status</th>
                <th scope="col" class="ta-table-th">Updated</th>
                <th scope="col" class="ta-table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (t of filteredTemplates(); track t.id) {
                <tr class="ta-table-row align-top">
                  <td class="px-5 py-4">
                    <div class="flex items-start gap-2">
                      <button type="button" (click)="toggleFavourite(t, $event)"
                        class="mt-0.5 shrink-0 rounded text-gray-300 transition-colors hover:text-yellow-400"
                        [class.text-yellow-400]="t.is_favourite"
                        [attr.aria-label]="t.is_favourite ? 'Remove from favourites' : 'Add to favourites'">
                        <svg class="h-4 w-4" [attr.fill]="t.is_favourite ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                        </svg>
                      </button>
                      <div class="min-w-0">
                        <div class="flex items-center gap-1 font-semibold text-gray-900 dark:text-white">
                          <span class="truncate">{{ t.name }}</span>
                          <app-help-trigger helpKey="admin.reports.card" label="Help for report template" />
                        </div>
                        <div class="mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400">{{ t.description || 'No description.' }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{{ t.form_name }}</td>
                  <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{{ terminalLabel(t.terminal_code) }}</td>
                  <td class="px-5 py-4">
                    <div class="flex flex-wrap gap-1.5">
                      @if (t.category) {
                        <span class="ta-badge ta-badge-info">{{ t.category }}</span>
                      }
                      @for (tag of t.tags; track tag) {
                        <span class="ta-badge ta-badge-neutral">#{{ tag }}</span>
                      }
                      @if (!t.category && !t.tags.length) {
                        <span class="text-sm text-gray-400">-</span>
                      }
                    </div>
                  </td>
                  <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{{ t.columns.length }}</td>
                  <td class="px-5 py-4">
                    <div class="flex flex-wrap gap-1.5">
                      @if (t.is_public) {
                        <span class="ta-badge ta-badge-success">Public</span>
                      } @else {
                        <span class="ta-badge ta-badge-neutral">Restricted</span>
                      }
                      @if (t.has_schema_drift) {
                        <span class="ta-badge ta-badge-warning">Outdated</span>
                      }
                    </div>
                  </td>
                  <td class="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{{ t.updated_at | date:'mediumDate' }}</td>
                  <td class="px-5 py-4">
                    <div class="flex justify-end gap-2">
                      <button type="button" (click)="runReport(t)" class="ta-btn ta-btn-primary px-3 py-1.5 text-xs">Run</button>
                      <button type="button" (click)="editReport(t)" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs">Edit</button>
                      <button type="button" (click)="duplicateReport(t)" [disabled]="duplicatingId() === t.id" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50">
                        {{ duplicatingId() === t.id ? 'Copying...' : 'Duplicate' }}
                      </button>
                      <button type="button" (click)="deleteReport(t)" class="ta-btn ta-btn-ghost px-3 py-1.5 text-xs text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
          <div class="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Showing {{ total() === 0 ? 0 : offset() + 1 }}-{{ Math.min(offset() + pageSize, total()) }} of {{ total() }}
            </div>
            <div class="flex items-center gap-2">
              <select [(ngModel)]="pageSize" (ngModelChange)="changePageSize()" class="ta-admin-control px-2 py-1 text-sm">
                <option [value]="10">10</option>
                <option [value]="25">25</option>
                <option [value]="50">50</option>
                <option [value]="100">100</option>
              </select>
              <button type="button" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs" [disabled]="offset() === 0" (click)="previousPage()">Previous</button>
              <span class="text-xs">Page {{ currentPage() }} of {{ totalPages() }}</span>
              <button type="button" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs" [disabled]="offset() + pageSize >= total()" (click)="nextPage()">Next</button>
            </div>
          </div>
        </div>
      }

    </div>

    <!-- Delete confirmation modal -->
    @if (deletingTemplate()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div class="ta-card w-full max-w-sm shadow-xl">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-2">Delete Report Template</h3>
          <p class="text-sm text-gray-600 dark:text-gray-500 mb-6">
            Are you sure you want to delete <strong class="text-gray-900 dark:text-white">{{ deletingTemplate()!.name }}</strong>? This cannot be undone.
          </p>
          <div class="flex gap-3 justify-end">
            <button type="button" (click)="deletingTemplate.set(null)" class="ta-btn ta-btn-secondary text-sm">Cancel</button>
            <button type="button" (click)="confirmDelete()" [disabled]="deleting()"
              class="ta-btn text-sm bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/40 disabled:opacity-50">
              {{ deleting() ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ReportsComponent implements OnInit {
  private reportService = inject(ReportTemplateService);
  private formService = inject(FormService);
  private router = inject(Router);

  templates = signal<ReportTemplate[]>([]);
  total = signal(0);
  offset = signal(0);
  forms = signal<Form[]>([]);
  categories = signal<string[]>([]);
  recentlyUsed = signal<number[]>([]);
  loading = signal(true);
  error = signal('');
  deletingTemplate = signal<ReportTemplate | null>(null);
  deleting = signal(false);
  duplicatingId = signal<number | null>(null);

  filterFormId = '';
  filterCategory = '';
  searchQuery = '';
  showDriftOnly = false;
  showFavouritesOnly = false;
  newReportFormId = '';
  pageSize = 25;
  readonly Math = Math;

  filteredTemplates = computed(() => this.templates());
  currentPage = computed(() => Math.floor(this.offset() / this.pageSize) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  favouriteTemplates = computed(() => this.templates().filter(t => t.is_favourite));

  recentlyUsedTemplates = computed(() => {
    const ids = this.recentlyUsed();
    const map = new Map(this.templates().map(t => [t.id, t]));
    return ids.map(id => map.get(id)).filter((t): t is ReportTemplate => !!t).slice(0, 5);
  });

  ngOnInit(): void {
    this.loadForms();
    this.loadCategories();
    this.loadTemplates();
    this.reportService.getRecentlyUsed().subscribe({ next: ids => this.recentlyUsed.set(ids), error: () => {} });
  }

  loadForms(): void {
    this.formService.list().subscribe({ next: res => this.forms.set(res), error: () => {} });
  }

  loadCategories(): void {
    this.reportService.getCategories().subscribe({ next: c => this.categories.set(c), error: () => {} });
  }

  loadTemplates(): void {
    this.loading.set(true);
    this.error.set('');
    const formId = this.filterFormId ? +this.filterFormId : undefined;
    this.reportService.listPaged({
      formId,
      category: this.filterCategory || undefined,
      q: this.searchQuery || undefined,
      favourite: this.showFavouritesOnly,
      drift: this.showDriftOnly,
      limit: this.pageSize,
      offset: this.offset(),
    }).subscribe({
      next: result => { this.templates.set(result.items); this.total.set(result.total ?? 0); this.loading.set(false); },
      error: () => { this.error.set('Failed to load report templates.'); this.loading.set(false); },
    });
  }

  applyFilters(): void {
    this.offset.set(0);
    this.loadTemplates();
  }

  clearFilters(): void {
    this.filterFormId = '';
    this.filterCategory = '';
    this.searchQuery = '';
    this.showDriftOnly = false;
    this.showFavouritesOnly = false;
    this.offset.set(0);
    this.loadTemplates();
  }

  changePageSize(): void {
    this.pageSize = Number(this.pageSize);
    this.offset.set(0);
    this.loadTemplates();
  }

  nextPage(): void {
    if (this.offset() + this.pageSize >= this.total()) return;
    this.offset.update(v => v + this.pageSize);
    this.loadTemplates();
  }

  previousPage(): void {
    this.offset.update(v => Math.max(0, v - this.pageSize));
    this.loadTemplates();
  }

  terminalLabel(code?: string | null): string {
    return code?.trim() || 'All';
  }

  toggleFavourite(t: ReportTemplate, event: Event): void {
    event.stopPropagation();
    if (t.is_favourite) {
      this.reportService.removeFavourite(t.id).subscribe({
        next: () => this.templates.update(list => list.map(x => x.id === t.id ? { ...x, is_favourite: false } : x)),
      });
    } else {
      this.reportService.addFavourite(t.id).subscribe({
        next: () => this.templates.update(list => list.map(x => x.id === t.id ? { ...x, is_favourite: true } : x)),
      });
    }
  }

  newReport(): void {
    if (!this.newReportFormId) return;
    this.router.navigate(['/admin/reports', this.newReportFormId, 'designer']);
  }

  newIntegrationReport(): void {
    if (!this.newReportFormId) return;
    this.router.navigate(['/admin/reports', this.newReportFormId, 'designer'], { queryParams: { source: 'integration_activity' } });
  }

  runReport(t: ReportTemplate): void { this.router.navigate(['/admin/reports', t.id, 'run']); }

  editReport(t: ReportTemplate): void {
    this.router.navigate(['/admin/reports', t.form_id, 'designer'], { queryParams: { templateId: t.id } });
  }

  duplicateReport(t: ReportTemplate): void {
    if (this.duplicatingId() !== null) return;
    this.error.set('');
    this.duplicatingId.set(t.id);
    this.reportService.duplicate(t.id).subscribe({
      next: () => {
        this.duplicatingId.set(null);
        this.loadTemplates();
      },
      error: () => {
        this.duplicatingId.set(null);
        this.error.set('Failed to duplicate report template.');
      },
    });
  }

  deleteReport(t: ReportTemplate): void { this.deletingTemplate.set(t); }

  confirmDelete(): void {
    const t = this.deletingTemplate();
    if (!t) return;
    this.deleting.set(true);
    this.reportService.delete(t.id).subscribe({
      next: () => {
        if (this.templates().length === 1 && this.offset() > 0) {
          this.offset.update(v => Math.max(0, v - this.pageSize));
        }
        this.loadTemplates();
        this.deletingTemplate.set(null);
        this.deleting.set(false);
      },
      error: () => { this.deleting.set(false); },
    });
  }
}
