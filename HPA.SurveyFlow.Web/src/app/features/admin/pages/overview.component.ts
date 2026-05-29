import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AdminService } from '../../../core/services/admin.service';
import { ReportTemplateService } from '../../../core/services/report-template.service';
import { AdminStats, ActivityItem, ReportTemplate } from '../../../core/models';

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

      <!-- My Reports widget -->
      <div *ngIf="favouriteReports().length > 0 || recentReports().length > 0" class="mb-8">
        <h2 class="text-base font-semibold text-gray-800 dark:text-white mb-4">My Reports</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

          <!-- Favourites -->
          <div *ngIf="favouriteReports().length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
              </svg>
              Favourites
            </h3>
            <ul class="flex flex-col gap-1.5">
              <li *ngFor="let t of favouriteReports()">
                <button type="button" (click)="runReport(t)"
                  class="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300 transition-colors truncate">
                  {{ t.name }}
                  <span class="text-xs text-gray-400 ml-1">{{ t.form_name }}</span>
                </button>
              </li>
            </ul>
          </div>

          <!-- Recently Used -->
          <div *ngIf="recentReports().length > 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
            <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Recently Used
            </h3>
            <ul class="flex flex-col gap-1.5">
              <li *ngFor="let t of recentReports()">
                <button type="button" (click)="runReport(t)"
                  class="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300 transition-colors truncate">
                  {{ t.name }}
                  <span class="text-xs text-gray-400 ml-1">{{ t.form_name }}</span>
                </button>
              </li>
            </ul>
          </div>

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
  private reportService = inject(ReportTemplateService);
  private router = inject(Router);

  stats = signal<AdminStats | null>(null);
  activity = signal<ActivityItem[]>([]);
  allTemplates = signal<ReportTemplate[]>([]);
  recentlyUsedIds = signal<number[]>([]);
  loadingStats = signal(true);
  loadingActivity = signal(true);
  error = signal('');

  favouriteReports = signal<ReportTemplate[]>([]);
  recentReports = signal<ReportTemplate[]>([]);

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

    this.reportService.list().subscribe({
      next: templates => {
        this.allTemplates.set(templates);
        this.favouriteReports.set(templates.filter(t => t.is_favourite).slice(0, 5));
        this.reportService.getRecentlyUsed().subscribe({
          next: ids => {
            const map = new Map(templates.map(t => [t.id, t]));
            this.recentReports.set(ids.map(id => map.get(id)).filter((t): t is ReportTemplate => !!t).slice(0, 5));
          },
          error: () => {},
        });
      },
      error: () => {},
    });
  }

  runReport(t: ReportTemplate): void {
    this.router.navigate(['/admin/reports', t.id, 'run']);
  }

  actorInitial(item: ActivityItem): string {
    const name = item.actor?.display_name || item.actor?.email || '?';
    return name.charAt(0).toUpperCase();
  }
}
