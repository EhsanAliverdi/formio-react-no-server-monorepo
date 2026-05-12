import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { AdminStats, ActivityItem } from '../../../core/models';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      <!-- Error -->
      <div *ngIf="error()" class="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {{ error() }}
      </div>

      <!-- Stats loading -->
      <div *ngIf="loadingStats()" class="flex justify-center items-center py-12">
        <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Stats grid -->
      <div *ngIf="!loadingStats() && stats()" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Forms</p>
          <p class="text-3xl font-bold text-indigo-600">{{ stats()!.totalForms }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Total Submissions</p>
          <p class="text-3xl font-bold text-indigo-600">{{ stats()!.totalSubmissions }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Submitted Forms</p>
          <p class="text-3xl font-bold text-indigo-600">{{ stats()!.submittedForms }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Today</p>
          <p class="text-3xl font-bold text-green-600">{{ stats()!.submissionsToday }}</p>
        </div>
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Last 7 Days</p>
          <p class="text-3xl font-bold text-blue-600">{{ stats()!.submissionsLast7Days }}</p>
        </div>
      </div>

      <!-- Activity feed -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="px-6 py-4 border-b border-gray-100">
          <h2 class="text-base font-semibold text-gray-800">Recent Activity</h2>
        </div>

        <div *ngIf="loadingActivity()" class="flex justify-center items-center py-10">
          <div class="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>

        <div *ngIf="!loadingActivity() && activity().length === 0"
             class="px-6 py-8 text-center text-sm text-gray-400">
          No recent activity.
        </div>

        <ul *ngIf="!loadingActivity() && activity().length > 0" class="divide-y divide-gray-50">
          <li *ngFor="let item of activity()" class="px-6 py-4 flex gap-4">
            <!-- Avatar -->
            <div class="flex-shrink-0">
              <img
                *ngIf="item.actor?.avatar_url"
                [src]="item.actor!.avatar_url"
                [alt]="item.actor?.display_name || item.actor?.email || ''"
                class="w-9 h-9 rounded-full object-cover"
              />
              <div
                *ngIf="!item.actor?.avatar_url"
                class="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-semibold"
              >
                {{ actorInitial(item) }}
              </div>
            </div>
            <!-- Content -->
            <div class="flex-1 min-w-0">
              <p class="text-sm text-gray-800 font-medium truncate">{{ item.title }}</p>
              <p class="text-xs text-gray-500 mt-0.5 truncate">{{ item.summary }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ item.occurred_at | date:'short' }}</p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  `,
})
export class OverviewComponent implements OnInit {
  private adminService = inject(AdminService);

  stats = signal<AdminStats | null>(null);
  activity = signal<ActivityItem[]>([]);
  loadingStats = signal(true);
  loadingActivity = signal(true);
  error = signal('');

  ngOnInit(): void {
    this.adminService.getStats().subscribe({
      next: (s) => {
        this.stats.set(s);
        this.loadingStats.set(false);
      },
      error: (err) => {
        this.loadingStats.set(false);
        this.error.set(err?.error?.error || 'Failed to load dashboard stats.');
      },
    });

    this.adminService.getActivity(10).subscribe({
      next: (res) => {
        this.activity.set(res.items);
        this.loadingActivity.set(false);
      },
      error: () => {
        this.loadingActivity.set(false);
      },
    });
  }

  actorInitial(item: ActivityItem): string {
    const name = item.actor?.display_name || item.actor?.email || '?';
    return name.charAt(0).toUpperCase();
  }
}
