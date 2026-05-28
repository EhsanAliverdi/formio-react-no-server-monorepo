import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportColumnDefinition } from '../../../core/models';

@Component({
  selector: 'app-report-data-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-0">
      <!-- Table wrapper -->
      <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table class="min-w-full text-sm">
          <thead>
            <tr class="bg-gray-50 border-b border-gray-200">
              @for (col of columns; track $index) {
                <th
                  class="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap select-none cursor-pointer hover:bg-gray-100 transition-colors"
                  [style.width.px]="col.width ?? undefined"
                  (click)="onSort(col.field_key)"
                >
                  <span class="flex items-center gap-1">
                    {{ col.label }}
                    @if (sortField === col.field_key) {
                      <svg class="w-3 h-3 text-brand-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        @if (sortDirection === 'asc') {
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>
                        } @else {
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                        }
                      </svg>
                    }
                  </span>
                </th>
              }
              @if (columns.length === 0) {
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-500">No columns configured</th>
              }
            </tr>
          </thead>
          <tbody>
            @if (loading) {
              @for (sk of skeletonRows; track $index) {
                <tr class="border-t border-gray-100">
                  @for (col of columns; track $index) {
                    <td class="px-4 py-3">
                      <div class="h-4 bg-gray-200 rounded animate-pulse" [style.width]="'60%'"></div>
                    </td>
                  }
                  @if (columns.length === 0) {
                    <td class="px-4 py-3"><div class="h-4 w-32 bg-gray-200 rounded animate-pulse"></div></td>
                  }
                </tr>
              }
            } @else if (rows.length === 0) {
              <tr>
                <td [attr.colspan]="columns.length || 1" class="px-4 py-10 text-center text-gray-400">
                  <div class="flex flex-col items-center gap-2">
                    <svg class="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                    <span class="text-sm">No results found</span>
                  </div>
                </td>
              </tr>
            } @else {
              @for (row of rows; track $index) {
                <tr class="border-t border-gray-100 hover:bg-gray-50/60 transition-colors">
                  @for (col of columns; track $index) {
                    <td class="px-4 py-3 text-gray-700 max-w-xs truncate" [title]="getCellValue(row, col.field_key)">
                      {{ getCellValue(row, col.field_key) }}
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      @if (!loading && total > 0) {
        <div class="flex items-center justify-between px-1 py-3 text-sm text-gray-500">
          <span>
            Showing {{ pageStart }}–{{ pageEnd }} of {{ total }} result{{ total !== 1 ? 's' : '' }}
          </span>
          <div class="flex items-center gap-1">
            <button
              type="button"
              (click)="onPage(page - 1)"
              [disabled]="page <= 1"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>

            @for (pg of pageNumbers; track pg) {
              @if (pg === -1) {
                <span class="px-1 text-gray-400">…</span>
              } @else {
                <button
                  type="button"
                  (click)="onPage(pg)"
                  [class]="pg === page
                    ? 'inline-flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 text-white text-xs font-semibold'
                    : 'inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 text-xs transition-colors'"
                >{{ pg }}</button>
              }
            }

            <button
              type="button"
              (click)="onPage(page + 1)"
              [disabled]="page >= totalPages"
              class="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ReportDataTableComponent {
  @Input() columns: ReportColumnDefinition[] = [];
  @Input() rows: Record<string, any>[] = [];
  @Input() total = 0;
  @Input() page = 1;
  @Input() pageSize = 25;
  @Input() loading = false;
  @Input() sortField?: string;
  @Input() sortDirection: 'asc' | 'desc' = 'asc';

  @Output() sortChange = new EventEmitter<{ field: string; direction: 'asc' | 'desc' }>();
  @Output() pageChange = new EventEmitter<number>();

  readonly skeletonRows = Array(5).fill(null);

  get totalPages(): number { return Math.ceil(this.total / this.pageSize) || 1; }
  get pageStart(): number { return Math.min((this.page - 1) * this.pageSize + 1, this.total); }
  get pageEnd(): number { return Math.min(this.page * this.pageSize, this.total); }

  get pageNumbers(): number[] {
    const pages: number[] = [];
    const total = this.totalPages;
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (this.page > 3) pages.push(-1);
    const start = Math.max(2, this.page - 1);
    const end = Math.min(total - 1, this.page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (this.page < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  }

  getCellValue(row: Record<string, any>, fieldKey: string): string {
    const val = row[fieldKey];
    if (val == null) return '';
    if (Array.isArray(val)) return val.join(', ');
    return String(val);
  }

  onSort(field_key: string): void {
    const direction = this.sortField === field_key && this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ field: field_key, direction });
  }

  onPage(pg: number): void {
    if (pg < 1 || pg > this.totalPages) return;
    this.pageChange.emit(pg);
  }
}
