import { Component, Input, OnChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ReportTemplateService } from '../../../core/services/report-template.service';
import { ChartConfig, ChartTypeName, ReportExecutionResult, ReportTemplate } from '../../../core/models';
import { ReportChartComponent } from '../report-chart/report-chart.component';
import { ReportDataTableComponent } from '../report-data-table/report-data-table.component';

@Component({
  selector: 'app-dashboard-report-card',
  standalone: true,
  imports: [CommonModule, ReportChartComponent, ReportDataTableComponent],
  template: `
    @if (loading()) {
      <div class="flex h-full items-center justify-center text-sm text-gray-400">Loading report...</div>
    } @else if (error()) {
      <div class="flex h-full items-center justify-center px-4 text-center text-sm text-red-500">{{ error() }}</div>
    } @else if (result()) {
      @if (chartType !== 'table') {
        <app-report-chart
          [chartType]="chartType"
          [config]="chartConfig"
          [columns]="result()!.columns"
          [rows]="result()!.rows"
        />
      } @else {
        <app-report-data-table
          [columns]="result()!.columns"
          [rows]="result()!.rows"
          [total]="result()!.total"
          [page]="1"
          [pageSize]="10"
          [loading]="false"
        />
      }
    }
  `,
})
export class DashboardReportCardComponent implements OnChanges {
  @Input({ required: true }) reportId!: number;
  @Input() dashboardSlug?: string;
  @Input() dashboardCardId?: number;
  @Input() chartType: ChartTypeName = 'table';
  @Input() chartConfig: ChartConfig = {};

  private reports = inject(ReportTemplateService);
  private dashboards = inject(DashboardService);

  template = signal<ReportTemplate | null>(null);
  result = signal<ReportExecutionResult | null>(null);
  loading = signal(true);
  error = signal('');

  ngOnChanges(): void {
    if (!this.reportId) return;
    this.loading.set(true);
    this.error.set('');
    if (this.dashboardSlug && this.dashboardCardId) {
      this.dashboards.executePublicCard(this.dashboardSlug, this.dashboardCardId, { template_id: this.reportId, page: 1, page_size: 10 }).subscribe({
        next: result => { this.result.set(result); this.loading.set(false); },
        error: () => { this.error.set('Unable to load this report.'); this.loading.set(false); },
      });
      return;
    }
    this.reports.get(this.reportId).subscribe({
      next: template => {
        this.template.set(template);
        this.chartType = template.chart_type;
        this.chartConfig = template.chart_config ?? {};
        const request = { template_id: template.id, page: 1, page_size: 10 };
        this.reports.execute(request).subscribe({
          next: result => { this.result.set(result); this.loading.set(false); },
          error: () => { this.error.set('Unable to load this report.'); this.loading.set(false); },
        });
      },
      error: () => { this.error.set('Unable to load this report.'); this.loading.set(false); },
    });
  }
}
