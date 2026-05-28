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

export interface ChartConfig {
  x_axis?: string;
  y_axes?: string[];
}

const PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#EC4899', '#84CC16', '#F97316', '#6366F1',
];

// Cached promise so the script is only injected once
let chartJsReady: Promise<void> | null = null;

function loadChartJs(): Promise<void> {
  if (chartJsReady) return chartJsReady;
  chartJsReady = new Promise<void>((resolve, reject) => {
    // Already loaded (e.g. HMR reload)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any)['Chart']) { resolve(); return; }
    const script = document.createElement('script');
    script.src = '/chart.umd.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load chart.js'));
    document.head.appendChild(script);
  });
  return chartJsReady;
}

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
  @Input() rows: Record<string, unknown>[] = [];
  @Input() chartHeight = 320;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private chart: any;

  ngAfterViewInit(): void { this.rebuild(); }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rows'] || changes['chartType'] || changes['config'] || changes['columns']) {
      setTimeout(() => this.rebuild(), 0);
    }
  }

  ngOnDestroy(): void { this.chart?.destroy(); }

  numberCards(): { label: string; value: string }[] {
    if (this.rows.length === 0) return [];
    const yAxes = this.config.y_axes?.length ? this.config.y_axes : this.yAliases();
    return yAxes.map(alias => {
      const col = this.columns.find(c => c.field_key === alias);
      const sum = this.rows.reduce((acc, r) => acc + (parseFloat(String(r[alias] ?? 0)) || 0), 0);
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

  private rebuild(): void {
    this.chart?.destroy();
    this.chart = undefined;
    if (this.chartType === 'number_card') return;
    if (!this.canvasRef || this.rows.length === 0) return;

    const xAlias = this.config.x_axis ?? this.xAlias();
    const yAliases = this.config.y_axes?.length ? this.config.y_axes : this.yAliases();
    const labels = this.rows.map(r => String(r[xAlias] ?? ''));
    const isPie = this.chartType === 'pie' || this.chartType === 'doughnut';

    const datasets = yAliases.map((alias, i) => {
      const col = this.columns.find(c => c.field_key === alias);
      const data = this.rows.map(r => parseFloat(String(r[alias] ?? 0)) || 0);
      const color = PALETTE[i % PALETTE.length];
      return {
        label: col?.label ?? alias,
        data,
        backgroundColor: isPie ? PALETTE.slice(0, data.length) : color + '99',
        borderColor: isPie ? PALETTE.slice(0, data.length) : color,
        borderWidth: isPie ? 1 : 2,
        fill: this.chartType === 'line' ? false : undefined,
        tension: this.chartType === 'line' ? 0.3 : undefined,
      };
    });

    const chartConfig = {
      type: this.chartType,
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

    // Load chart.js UMD via a script tag — completely invisible to the TypeScript
    // compiler and Angular's esbuild plugin. window.Chart is set by the UMD bundle.
    loadChartJs().then(() => {
      if (!this.canvasRef) return;
      this.chart?.destroy();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ChartClass = (window as any)['Chart'];
      this.chart = new ChartClass(this.canvasRef.nativeElement, chartConfig);
    });
  }

  private xAlias(): string {
    return this.columns[0]?.field_key ?? '';
  }

  private yAliases(): string[] {
    return this.columns.slice(1).map(c => c.field_key);
  }
}
