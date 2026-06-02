import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardCard } from '../../../core/models';
import { DashboardReportCardComponent } from '../dashboard-report-card/dashboard-report-card.component';

@Component({
  selector: 'app-dashboard-card',
  standalone: true,
  imports: [CommonModule, DashboardReportCardComponent],
  template: `
    <section class="flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <header class="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 dark:border-gray-700">
        <h3 class="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
          {{ card.title_override || card.report_name }}
        </h3>
        @if (mode === 'designer') {
          <button type="button" class="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400" (click)="settings.emit(card)">Title</button>
          <button type="button" class="text-xs text-red-600 hover:text-red-800 dark:text-red-400" (click)="remove.emit(card)">Remove</button>
        }
      </header>
      <div class="min-h-0 flex-1 overflow-auto p-3">
        <app-dashboard-report-card
          [reportId]="card.report_id"
          [dashboardSlug]="dashboardSlug"
          [dashboardCardId]="card.id"
          [chartType]="card.report_chart_type"
          [chartConfig]="card.report_chart_config ?? {}"
        />
      </div>
    </section>
  `,
})
export class DashboardCardComponent {
  @Input({ required: true }) card!: DashboardCard;
  @Input() mode: 'designer' | 'viewer' = 'viewer';
  @Input() dashboardSlug?: string;
  @Output() remove = new EventEmitter<DashboardCard>();
  @Output() settings = new EventEmitter<DashboardCard>();
}
