import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { Dashboard } from '../../../core/models';

@Component({
  selector: 'app-dashboard-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          @for (dashboard of dashboards(); track dashboard.id) {
            <article class="ta-card">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="font-semibold text-gray-900 dark:text-white">{{ dashboard.name }}</h2>
                  <p class="mt-1 text-xs font-mono text-gray-400">/reporting/d/{{ dashboard.slug }}</p>
                </div>
                <span class="ta-badge" [class]="dashboard.visibility === 'public' ? 'ta-badge-success' : 'ta-badge-warning'">{{ dashboard.visibility }}</span>
              </div>
              <p class="mt-3 min-h-10 text-sm text-gray-500 dark:text-gray-400">{{ dashboard.description || 'No description.' }}</p>
              <p class="mt-3 text-xs text-gray-400">{{ dashboard.cards.length }} card(s)</p>
              <div class="mt-4 flex flex-wrap gap-2">
                <a [routerLink]="['/admin/reporting/dashboards', dashboard.id, 'designer']" class="ta-btn ta-btn-primary px-3 py-1.5 text-xs">Design</a>
                <a [routerLink]="['/admin/reporting/dashboards', dashboard.id, 'edit']" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs">Edit</a>
                <a [routerLink]="['/reporting/d', dashboard.slug]" target="_blank" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs">View</a>
                <button type="button" (click)="remove(dashboard)" class="ta-btn ta-btn-ghost px-3 py-1.5 text-xs text-red-600">Delete</button>
              </div>
            </article>
          }
        </div>
      }
    </div>
  `,
})
export class DashboardListComponent implements OnInit {
  private dashboardsService = inject(DashboardService);
  private confirm = inject(ConfirmDialogService);
  dashboards = signal<Dashboard[]>([]);
  loading = signal(true);
  error = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.dashboardsService.list().subscribe({
      next: dashboards => { this.dashboards.set(dashboards); this.loading.set(false); },
      error: () => { this.error.set('Failed to load dashboards.'); this.loading.set(false); },
    });
  }

  async remove(dashboard: Dashboard): Promise<void> {
    if (!await this.confirm.open({ title: 'Delete Dashboard', message: `Delete "${dashboard.name}"?`, confirmLabel: 'Delete', variant: 'danger' })) return;
    this.dashboardsService.delete(dashboard.id).subscribe({
      next: () => this.dashboards.update(items => items.filter(item => item.id !== dashboard.id)),
      error: () => this.error.set('Failed to delete dashboard.'),
    });
  }
}
