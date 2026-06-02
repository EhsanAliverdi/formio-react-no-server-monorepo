import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { Dashboard } from '../../../core/models';
import { DashboardGridComponent } from '../../../shared/components/dashboard-grid/dashboard-grid.component';

@Component({
  selector: 'app-dashboard-viewer',
  standalone: true,
  imports: [CommonModule, DashboardGridComponent],
  template: `
    @if (error()) {
      <div class="ta-alert-error">{{ error() }}</div>
    } @else if (dashboard()) {
      <div>
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ dashboard()!.name }}</h1>
          @if (dashboard()!.description) { <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ dashboard()!.description }}</p> }
        </div>
        @if (dashboard()!.cards.length === 0) {
          <div class="ta-card py-16 text-center text-sm text-gray-400">This dashboard has no report cards yet.</div>
        } @else {
          <app-dashboard-grid [dashboard]="dashboard()!" mode="viewer" />
        }
      </div>
    } @else {
      <div class="py-16 text-center text-sm text-gray-400">Loading dashboard...</div>
    }
  `,
})
export class DashboardViewerComponent implements OnInit {
  private service = inject(DashboardService);
  private slug = inject(ActivatedRoute).snapshot.paramMap.get('slug')!;
  dashboard = signal<Dashboard | null>(null);
  error = signal('');

  ngOnInit(): void {
    this.service.getBySlug(this.slug).subscribe({
      next: dashboard => this.dashboard.set(dashboard),
      error: err => this.error.set(err.status === 401 ? 'Sign in to view this dashboard.' : 'Dashboard not found.'),
    });
  }
}
