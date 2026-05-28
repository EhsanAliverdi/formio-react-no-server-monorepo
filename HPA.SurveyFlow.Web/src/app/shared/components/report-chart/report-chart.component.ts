import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  ElementRef,
  ViewChild,
  SimpleChanges,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType } from 'chart.js/auto';

export interface ChartConfig {
  /** Column alias used as X-axis labels / pie slice labels */
  x_axis?: string;
  /** Column aliases used as Y-axis series (one bar/line per alias) */
  y_axes?: string[];
}

const PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
];

@Component({
  selector: 'app-report-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full flex flex-col gap-3">

      <!-- Number card mode -->
      @if (chartType === 'number_card') {
        <div class="grid gap-4" [class]="cardGridClass()">
          @for (card of numberCards(); track card.label) {
            <div class="ta-card flex flex-col items-center justify-center py-6 text-center gap-1">
              <span class="text-3xl font-bold text-brand-600 dark:text-brand-400">{{ card.value }}</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">{{ card.label }}</span>
            </div>
          }
        </div>
      }

      <!-- Canvas chart modes -->
      @else {
        @if (rows.length === 0) {
          <div class="flex items-center justify-center h-64 text-gray-400 text-sm">No data to display</div>
        } @else {
          <div class="relative" [style.height.px]="chartHeight">
            <canvas #chartCanvas></canvas>
          </div>
        }
      }
    </div>
  `,
})
export class ReportChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('chartCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;

  @Input() chartType: string = 'bar';
  @Input() config: ChartConfig = {};
  @Input() columns: { field_key: string; label: string }[] = [];
  @Input() rows: Record<string, any>[] = [];
  @Input() chartHeight = 320;

  private chart?: Chart;

  ngAfterViewInit(): void { this.rebuild(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows'] || changes['chartType'] || changes['config'] || changes['columns']) {
      // defer to next tick so canvas is ready after *ngIf resolves
      setTimeout(() => this.rebuild(), 0);
    }
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  // ── Number card helpers ───────────────────────────────────────────────────

  numberCards(): { label: string; value: string }[] {
    if (this.rows.length === 0) return [];
    const yAxes = this.config.y_axes?.length ? this.config.y_axes : this.yAliases();
    // Aggregate: sum all rows per y-axis (or just show first row value)
    return yAxes.map(alias => {
      const col = this.columns.find(c => c.field_key === alias);
      const sum = this.rows.reduce((acc, r) => acc + (parseFloat(r[alias]) || 0), 0);
      const display = Number.isInteger(sum) ? sum.toLocaleString() : sum.toFixed(2);
      return { label: col?.label ?? alias, value: display };
    });
  }

  cardGridClass(): string {
    const n = this.numberCards().length;
    if (n <= 2) return 'grid-cols-2';
    if (n <= 4) return 'grid-cols-2 sm:grid-cols-4';
    return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';
  }

  // ── Chart build ───────────────────────────────────────────────────────────

  private rebuild(): void {
    this.chart?.destroy();
    this.chart = undefined;
    if (this.chartType === 'number_card') return;
    if (!this.canvasRef || this.rows.length === 0) return;

    const xAlias = this.config.x_axis ?? this.xAlias();
    const yAliases = this.config.y_axes?.length ? this.config.y_axes : this.yAliases();

    const labels = this.rows.map(r => String(r[xAlias] ?? ''));

    const type = this.chartType as ChartType;
    const isPie = type === 'pie' || type === 'doughnut';

    const datasets = yAliases.map((alias, i) => {
      const col = this.columns.find(c => c.field_key === alias);
      const data = this.rows.map(r => parseFloat(r[alias]) || 0);
      const color = PALETTE[i % PALETTE.length];
      return {
        label: col?.label ?? alias,
        data,
        backgroundColor: isPie ? PALETTE.slice(0, data.length) : color + '99',
        borderColor: isPie ? PALETTE.slice(0, data.length) : color,
        borderWidth: isPie ? 1 : 2,
        fill: type === 'line' ? false : undefined,
        tension: type === 'line' ? 0.3 : undefined,
      };
    });

    const config: ChartConfiguration = {
      type,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1 || isPie, position: 'bottom' },
          tooltip: { mode: 'index', intersect: false },
        },
        scales: isPie ? {} : {
          x: { ticks: { maxRotation: 45 } },
          y: { beginAtZero: true },
        },
      },
    };

    this.chart = new Chart(this.canvasRef.nativeElement, config);
  }

  // ── Alias inference fallbacks (when config not yet set) ───────────────────

  private xAlias(): string {
    return this.columns[0]?.field_key ?? '';
  }

  private yAliases(): string[] {
    // Assume all numeric-looking columns after the first are y-axes
    return this.columns.slice(1).map(c => c.field_key);
  }
}
