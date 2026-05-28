import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReportTemplateService } from '../../../core/services/report-template.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConditionGroup,
  FieldDescriptor,
  ReportExecutionResult,
  ReportTemplate,
} from '../../../core/models';
import { ReportDataTableComponent } from '../../../shared/components/report-data-table/report-data-table.component';
import { ReportFilterPanelComponent } from '../../../shared/components/report-filter-panel/report-filter-panel.component';

@Component({
  selector: 'app-report-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ReportDataTableComponent, ReportFilterPanelComponent],
  template: `
    <div class="flex flex-col min-h-full">

      <!-- Header bar -->
      <div class="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        <div class="flex items-center gap-3">
          <button type="button" (click)="goBack()"
            class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
          </button>

          <div class="flex-1 min-w-0">
            @if (template()) {
              <h1 class="text-lg font-bold text-gray-900 dark:text-white truncate leading-tight">{{ template()!.name }}</h1>
              <p class="text-xs text-gray-400 leading-tight">{{ template()!.form_name }}</p>
            } @else {
              <div class="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1"></div>
              <div class="h-3 w-24 bg-gray-100 dark:bg-gray-700/60 rounded animate-pulse"></div>
            }
          </div>

          <div class="flex items-center gap-2 flex-shrink-0">
            <!-- Filter toggle -->
            <button
              type="button"
              (click)="filterPanelOpen.set(!filterPanelOpen())"
              class="ta-btn ta-btn-secondary text-sm"
              [class.bg-brand-50]="filterPanelOpen()"
              [class.border-brand-300]="filterPanelOpen()"
              [class.text-brand-700]="filterPanelOpen()"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
              </svg>
              Filters
              @if (hasRuntimeFilters()) {
                <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">
                  {{ runtimeFilters()!.children.length }}
                </span>
              }
            </button>

            <!-- CSV export -->
            @if (template()) {
              <a
                [href]="csvUrl()"
                class="ta-btn ta-btn-secondary text-sm"
                target="_blank"
                rel="noopener"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                Export CSV
              </a>
            }

            <!-- Edit template -->
            @if (canManage() && template()) {
              <a
                [routerLink]="['/admin/reports', template()!.form_id, 'designer']"
                [queryParams]="{ templateId: template()!.id }"
                class="ta-btn ta-btn-secondary text-sm"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
                Edit
              </a>
            }
          </div>
        </div>
      </div>

      <!-- Schema drift banner -->
      @if (schemaDrift()) {
        <div class="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 px-6 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          The form schema has changed since this template was saved. Some columns may return empty values.
          @if (canManage() && template()) {
            <a [routerLink]="['/admin/reports', template()!.form_id, 'designer']" [queryParams]="{ templateId: template()!.id }"
              class="underline font-medium hover:no-underline">Open editor to update.</a>
          }
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <div class="ta-alert-error mx-6 mt-3">{{ error() }}</div>
      }

      <div class="flex-1 p-6 flex flex-col gap-4">

        <!-- Runtime filter panel -->
        @if (filterPanelOpen() && fields().length > 0) {
          <div class="ta-card p-4">
            <app-report-filter-panel
              [fields]="fields()"
              [value]="runtimeFilters()"
              label="Runtime Filters"
              [collapsible]="false"
              (valueChange)="runtimeFilters.set($event)"
            />
            <div class="mt-3 flex items-center gap-2">
              <button type="button" (click)="applyFilters()" class="ta-btn ta-btn-primary text-sm">Apply</button>
              @if (hasRuntimeFilters()) {
                <button type="button" (click)="clearFilters()" class="ta-btn ta-btn-secondary text-sm text-red-500 hover:text-red-700 border-red-200 hover:border-red-300">Clear filters</button>
              }
            </div>
          </div>
        }

        <!-- Toolbar -->
        @if (result()) {
          <div class="flex items-center justify-between gap-4 text-sm">
            <span class="text-gray-500 dark:text-gray-400">
              {{ result()!.total }} result{{ result()!.total !== 1 ? 's' : '' }}
            </span>
            <div class="flex items-center gap-2">
              <label class="text-xs text-gray-500 dark:text-gray-400">Per page</label>
              <select
                [(ngModel)]="pageSize"
                (ngModelChange)="onPageSizeChange($event)"
                class="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option [value]="10">10</option>
                <option [value]="25">25</option>
                <option [value]="50">50</option>
                <option [value]="100">100</option>
              </select>
            </div>
          </div>
        }

        <!-- Data table -->
        <app-report-data-table
          [columns]="result()?.columns ?? (template()?.columns ?? [])"
          [rows]="result()?.rows ?? []"
          [total]="result()?.total ?? 0"
          [page]="page()"
          [pageSize]="pageSize"
          [loading]="loading()"
          [sortField]="sortField()"
          [sortDirection]="sortDirection()"
          (sortChange)="onSortChange($event)"
          (pageChange)="onPageChange($event)"
        />
      </div>
    </div>
  `,
})
export class ReportViewerComponent implements OnInit {
  private reportService = inject(ReportTemplateService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  template = signal<ReportTemplate | null>(null);
  result = signal<ReportExecutionResult | null>(null);
  loading = signal(false);
  error = signal('');
  schemaDrift = signal(false);
  filterPanelOpen = signal(false);
  runtimeFilters = signal<ConditionGroup | null>(null);
  sortField = signal<string | undefined>(undefined);
  sortDirection = signal<'asc' | 'desc'>('asc');
  page = signal(1);
  pageSize = 25;

  get fields(): () => FieldDescriptor[] {
    return () => (this.template()?.columns ?? []).map(c => ({
      key: c.field_key,
      label: c.label,
      type: 'text' as const,
    }));
  }

  get hasRuntimeFilters(): () => boolean {
    return () => (this.runtimeFilters()?.children?.length ?? 0) > 0;
  }

  get canManage(): () => boolean {
    return () => ['admin', 'editor'].includes(this.authService.currentUser()?.role ?? '');
  }

  csvUrl(): string {
    return this.reportService.exportCsvUrl(
      this.template()!.id,
      this.sortField(),
      this.sortDirection(),
      this.runtimeFilters(),
    );
  }

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.reportService.get(id).subscribe({
      next: t => {
        this.template.set(t);
        this.schemaDrift.set(t.has_schema_drift);
        this.sortField.set(t.default_sort_field ?? undefined);
        this.sortDirection.set((t.default_sort_direction as 'asc' | 'desc') ?? 'asc');
        this.pageSize = t.default_page_size ?? 25;
        this.runReport();
      },
      error: () => this.error.set('Failed to load report template.'),
    });
  }

  runReport(): void {
    const t = this.template();
    if (!t) return;
    this.loading.set(true);
    this.error.set('');
    this.reportService.execute({
      template_id: t.id,
      runtime_filters: this.runtimeFilters(),
      sort_field: this.sortField(),
      sort_direction: this.sortDirection(),
      page: this.page(),
      page_size: this.pageSize,
    }).subscribe({
      next: r => { this.result.set(r); this.loading.set(false); },
      error: () => { this.error.set('Report execution failed. Please try again.'); this.loading.set(false); },
    });
  }

  applyFilters(): void { this.page.set(1); this.runReport(); }

  clearFilters(): void {
    this.runtimeFilters.set(null);
    this.page.set(1);
    this.runReport();
  }

  onSortChange(ev: { field: string; direction: 'asc' | 'desc' }): void {
    this.sortField.set(ev.field);
    this.sortDirection.set(ev.direction);
    this.page.set(1);
    this.runReport();
  }

  onPageChange(pg: number): void { this.page.set(pg); this.runReport(); }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.page.set(1);
    this.runReport();
  }

  goBack(): void { this.router.navigate(['/admin/reports']); }
}
