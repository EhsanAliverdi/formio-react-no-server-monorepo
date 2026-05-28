import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ReportTemplateService } from '../../../core/services/report-template.service';
import { FormService } from '../../../core/services/form.service';
import { Form, ReportTemplate } from '../../../core/models';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-7xl mx-auto">

      <!-- Page header -->
      <div class="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Create and run dynamic reports on your form submissions</p>
        </div>
        @if (forms().length > 0) {
          <div class="flex items-center gap-2 flex-shrink-0">
            <select [(ngModel)]="newReportFormId" class="ta-field text-sm h-10 w-48">
              <option value="">Select a form…</option>
              @for (f of forms(); track f.id) {
                <option [value]="f.id">{{ f.name }}</option>
              }
            </select>
            <button type="button" (click)="newReport()" [disabled]="!newReportFormId"
              class="ta-btn ta-btn-primary h-10 disabled:opacity-50 disabled:cursor-not-allowed">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              New Report
            </button>
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
          <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Recently Used</h2>
          <div class="flex gap-2 flex-wrap">
            @for (t of recentlyUsedTemplates(); track t.id) {
              <button type="button" (click)="runReport(t)"
                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-900/20 dark:hover:text-brand-300 transition-colors">
                <svg class="w-3.5 h-3.5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ t.name }}
              </button>
            }
          </div>
        </div>
      }

      <!-- Favourites section -->
      @if (favouriteTemplates().length > 0 && !filterCategory && !searchQuery && !showDriftOnly && !filterFormId) {
        <div class="mb-6">
          <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Favourites</h2>
          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            @for (t of favouriteTemplates(); track t.id) {
              <ng-container *ngTemplateOutlet="templateCard; context: { $implicit: t, compact: true }"></ng-container>
            }
          </div>
        </div>
      }

      <!-- Filter bar -->
      <div class="mb-5 flex flex-wrap items-center gap-3">
        <!-- Form filter -->
        <select [(ngModel)]="filterFormId" (ngModelChange)="loadTemplates()" class="ta-field text-sm h-9 w-44">
          <option value="">All forms</option>
          @for (f of forms(); track f.id) {
            <option [value]="f.id">{{ f.name }}</option>
          }
        </select>

        <!-- Category filter -->
        @if (categories().length > 0) {
          <select [(ngModel)]="filterCategory" (ngModelChange)="applyFilters()" class="ta-field text-sm h-9 w-36">
            <option value="">All categories</option>
            @for (cat of categories(); track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
        }

        <!-- Search -->
        <div class="relative flex-1 min-w-36 max-w-64">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input type="search" [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()"
            placeholder="Search reports…" class="ta-field text-sm h-9 pl-9"/>
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
          </span>
        </label>

        <span class="text-sm text-gray-400 ml-auto">
          {{ loading() ? 'Loading…' : filteredTemplates().length + ' result' + (filteredTemplates().length !== 1 ? 's' : '') }}
        </span>
      </div>

      <!-- Loading skeleton -->
      @if (loading()) {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (sk of [1,2,3]; track sk) {
            <div class="ta-card animate-pulse">
              <div class="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div class="h-4 w-24 bg-gray-100 dark:bg-gray-700/60 rounded mb-4"></div>
              <div class="h-3 w-full bg-gray-100 dark:bg-gray-700/60 rounded"></div>
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @else if (filteredTemplates().length === 0) {
        <div class="ta-card flex flex-col items-center justify-center py-16 text-center">
          <div class="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
            <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          @if (templates().length === 0) {
            <h3 class="text-base font-semibold text-gray-800 dark:text-white mb-1">No report templates yet</h3>
            <p class="text-sm text-gray-400 mb-6 max-w-xs">Select a form and create your first report template to get started.</p>
            @if (forms().length > 0) {
              <div class="flex items-center gap-2">
                <select [(ngModel)]="newReportFormId" class="ta-field text-sm h-10 w-48">
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
            <p class="text-sm text-gray-400 mb-4">Try adjusting your filters.</p>
            <button type="button" (click)="clearFilters()" class="ta-btn ta-btn-secondary text-sm">Clear filters</button>
          }
        </div>
      }

      <!-- Template cards grid -->
      @else {
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (t of filteredTemplates(); track t.id) {
            <ng-container *ngTemplateOutlet="templateCard; context: { $implicit: t }"></ng-container>
          }
        </div>
      }

    </div>

    <!-- Reusable template card -->
    <ng-template #templateCard let-t let-compact="compact">
      <div class="ta-card flex flex-col gap-3 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all cursor-default group">

        <!-- Card header -->
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white truncate group-hover:text-brand-600 transition-colors">
              {{ t.name }}
            </h3>
            <p class="text-xs text-gray-400 mt-0.5">{{ t.form_name }}</p>
          </div>
          <div class="flex items-center gap-1 flex-shrink-0">
            <!-- Favourite star -->
            <button type="button" (click)="toggleFavourite(t, $event)"
              class="p-1 rounded transition-colors"
              [class]="t.is_favourite ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-300 hover:text-yellow-400'"
              [title]="t.is_favourite ? 'Remove from favourites' : 'Add to favourites'">
              <svg class="w-4 h-4" [attr.fill]="t.is_favourite ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
            </button>
            <div class="flex flex-wrap gap-1 justify-end">
              @if (t.is_public) {
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                  Public
                </span>
              }
              @if (t.has_schema_drift) {
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-medium" title="Form schema changed">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  Outdated
                </span>
              }
            </div>
          </div>
        </div>

        <!-- Category + Tags -->
        @if (t.category || t.tags?.length) {
          <div class="flex flex-wrap gap-1.5">
            @if (t.category) {
              <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300 text-xs font-medium border border-brand-200 dark:border-brand-700">
                {{ t.category }}
              </span>
            }
            @for (tag of t.tags; track tag) {
              <span class="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 text-xs">
                #{{ tag }}
              </span>
            }
          </div>
        }

        <!-- Description -->
        @if (t.description && !compact) {
          <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{{ t.description }}</p>
        }

        <!-- Meta -->
        <div class="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 6h18M3 14h18M3 18h18"/>
            </svg>
            {{ t.columns.length }} col{{ t.columns.length !== 1 ? 's' : '' }}
          </span>
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {{ t.updated_at | date:'mediumDate' }}
          </span>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <button type="button" (click)="runReport(t)" class="ta-btn ta-btn-primary text-xs h-8 px-3 flex-1">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Run
          </button>
          <button type="button" (click)="editReport(t)" class="ta-btn ta-btn-secondary text-xs h-8 px-3">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            Edit
          </button>
          <button type="button" (click)="deleteReport(t)"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete template">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
            </svg>
          </button>
        </div>
      </div>
    </ng-template>

    <!-- Delete confirmation modal -->
    @if (deletingTemplate()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div class="ta-card w-full max-w-sm shadow-xl">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-2">Delete Report Template</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
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
  forms = signal<Form[]>([]);
  categories = signal<string[]>([]);
  recentlyUsed = signal<number[]>([]);
  loading = signal(true);
  error = signal('');
  deletingTemplate = signal<ReportTemplate | null>(null);
  deleting = signal(false);

  filterFormId = '';
  filterCategory = '';
  searchQuery = '';
  showDriftOnly = false;
  showFavouritesOnly = false;
  newReportFormId = '';

  filteredTemplates = computed(() => {
    let list = this.templates();
    if (this.filterCategory) list = list.filter(t => t.category === this.filterCategory);
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.form_name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.tags?.some(tag => tag.toLowerCase().includes(q))
      );
    }
    if (this.showDriftOnly) list = list.filter(t => t.has_schema_drift);
    if (this.showFavouritesOnly) list = list.filter(t => t.is_favourite);
    return list;
  });

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
    this.reportService.list({ formId }).subscribe({
      next: t => { this.templates.set(t); this.loading.set(false); },
      error: () => { this.error.set('Failed to load report templates.'); this.loading.set(false); },
    });
  }

  applyFilters(): void { /* computed() handles this reactively */ }

  clearFilters(): void {
    this.filterCategory = '';
    this.searchQuery = '';
    this.showDriftOnly = false;
    this.showFavouritesOnly = false;
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

  runReport(t: ReportTemplate): void { this.router.navigate(['/admin/reports', t.id, 'run']); }

  editReport(t: ReportTemplate): void {
    this.router.navigate(['/admin/reports', t.form_id, 'designer'], { queryParams: { templateId: t.id } });
  }

  deleteReport(t: ReportTemplate): void { this.deletingTemplate.set(t); }

  confirmDelete(): void {
    const t = this.deletingTemplate();
    if (!t) return;
    this.deleting.set(true);
    this.reportService.delete(t.id).subscribe({
      next: () => {
        this.templates.update(list => list.filter(x => x.id !== t.id));
        this.deletingTemplate.set(null);
        this.deleting.set(false);
      },
      error: () => { this.deleting.set(false); },
    });
  }
}
