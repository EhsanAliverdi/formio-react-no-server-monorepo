import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { Dashboard } from '../../../core/models';

@Component({
  selector: 'app-dashboard-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div>
      <div class="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Dashboards</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Compose existing reports into reusable dashboard pages.</p>
        </div>
        <a routerLink="/admin/reporting/dashboards/new" class="ta-btn ta-btn-primary">New Dashboard</a>
      </div>

      @if (error()) { <div class="ta-alert-error mb-4">{{ error() }}</div> }
      @if (loading()) {
        <div class="py-16 text-center text-sm text-gray-400">Loading dashboards...</div>
      } @else if (dashboards().length === 0) {
        <div class="ta-card py-16 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">No dashboards yet.</p>
        </div>
      } @else {
        <div class="ta-table-shell">
          <table class="ta-table min-w-[940px]">
            <thead>
              <tr class="ta-table-head">
                <th scope="col" class="ta-table-th">Dashboard</th>
                <th scope="col" class="ta-table-th">URL</th>
                <th scope="col" class="ta-table-th">Terminal</th>
                <th scope="col" class="ta-table-th">Access</th>
                <th scope="col" class="ta-table-th">Cards</th>
                <th scope="col" class="ta-table-th">Updated</th>
                <th scope="col" class="ta-table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (dashboard of dashboards(); track dashboard.id) {
                <tr class="ta-table-row align-top">
                  <td class="px-5 py-4">
                    <div class="font-semibold text-gray-900 dark:text-white">{{ dashboard.name }}</div>
                    <div class="mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400">{{ dashboard.description || 'No description.' }}</div>
                  </td>
                  <td class="px-5 py-4 font-mono text-xs text-gray-500 dark:text-gray-400">/reporting/d/{{ dashboard.slug }}</td>
                  <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{{ terminalLabel(dashboard.terminal_code) }}</td>
                  <td class="px-5 py-4">
                    <span class="ta-badge" [class]="dashboard.visibility === 'public' ? 'ta-badge-success' : 'ta-badge-warning'">
                      {{ dashboard.visibility === 'public' ? 'Public' : 'Restricted' }}
                    </span>
                  </td>
                  <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{{ dashboard.cards.length }}</td>
                  <td class="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{{ dashboard.updated_at | date:'mediumDate' }}</td>
                  <td class="px-5 py-4">
                    <div class="flex justify-end gap-2">
                      <a [routerLink]="['/admin/reporting/dashboards', dashboard.id, 'designer']" class="ta-btn ta-btn-primary px-3 py-1.5 text-xs">Design</a>
                      <a [routerLink]="['/admin/reporting/dashboards', dashboard.id, 'edit']" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs">Edit</a>
                      <a [routerLink]="['/reporting/d', dashboard.slug]" target="_blank" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs">View</a>
                      <button type="button" (click)="duplicate(dashboard)" [disabled]="duplicatingId() === dashboard.id" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50">
                        {{ duplicatingId() === dashboard.id ? 'Copying...' : 'Duplicate' }}
                      </button>
                      <button type="button" (click)="remove(dashboard)" class="ta-btn ta-btn-ghost px-3 py-1.5 text-xs text-red-600">Delete</button>
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
  `,
})
export class DashboardListComponent implements OnInit {
  private dashboardsService = inject(DashboardService);
  private confirm = inject(ConfirmDialogService);
  dashboards = signal<Dashboard[]>([]);
  total = signal(0);
  offset = signal(0);
  loading = signal(true);
  error = signal('');
  duplicatingId = signal<number | null>(null);
  pageSize = 25;
  readonly Math = Math;
  currentPage = computed(() => Math.floor(this.offset() / this.pageSize) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.dashboardsService.listPaged({ limit: this.pageSize, offset: this.offset() }).subscribe({
      next: result => {
        this.dashboards.set(result.items);
        this.total.set(result.total ?? 0);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load dashboards.'); this.loading.set(false); },
    });
  }

  changePageSize(): void {
    this.pageSize = Number(this.pageSize);
    this.offset.set(0);
    this.load();
  }

  nextPage(): void {
    if (this.offset() + this.pageSize >= this.total()) return;
    this.offset.update(v => v + this.pageSize);
    this.load();
  }

  previousPage(): void {
    this.offset.update(v => Math.max(0, v - this.pageSize));
    this.load();
  }

  terminalLabel(code?: string | null): string {
    return code?.trim() || 'All';
  }

  async remove(dashboard: Dashboard): Promise<void> {
    if (!await this.confirm.open({ title: 'Delete Dashboard', message: `Delete "${dashboard.name}"?`, confirmLabel: 'Delete', variant: 'danger' })) return;
    this.dashboardsService.delete(dashboard.id).subscribe({
      next: () => {
        if (this.dashboards().length === 1 && this.offset() > 0) {
          this.offset.update(v => Math.max(0, v - this.pageSize));
        }
        this.load();
      },
      error: () => this.error.set('Failed to delete dashboard.'),
    });
  }

  duplicate(dashboard: Dashboard): void {
    if (this.duplicatingId() !== null) return;
    this.error.set('');
    this.duplicatingId.set(dashboard.id);
    this.dashboardsService.duplicate(dashboard.id).subscribe({
      next: () => {
        this.duplicatingId.set(null);
        this.load();
      },
      error: () => {
        this.duplicatingId.set(null);
        this.error.set('Failed to duplicate dashboard.');
      },
    });
  }
}
