import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DashboardService } from '../../../core/services/dashboard.service';
import { ReportTemplateService } from '../../../core/services/report-template.service';
import { Dashboard, DashboardCard, ReportTemplate, SaveDashboardCardRequest } from '../../../core/models';
import { DashboardGridComponent } from '../../../shared/components/dashboard-grid/dashboard-grid.component';
import { ReportPickerPanelComponent } from '../../../shared/components/report-picker-panel/report-picker-panel.component';

@Component({
  selector: 'app-dashboard-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, DashboardGridComponent, ReportPickerPanelComponent],
  template: `
    @if (dashboard()) {
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ dashboard()!.name }}</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">Add reports, drag or resize cards, then save the layout.</p>
          </div>
          <div class="flex gap-2">
            <a [routerLink]="['/reporting/d', dashboard()!.slug]" target="_blank" class="ta-btn ta-btn-secondary">Preview</a>
            <button type="button" (click)="saveLayout()" [disabled]="saving()" class="ta-btn ta-btn-primary">{{ saving() ? 'Saving...' : 'Save Layout' }}</button>
          </div>
        </div>
        @if (message()) { <div class="ta-alert-success">{{ message() }}</div> }
        @if (error()) { <div class="ta-alert-error">{{ error() }}</div> }

        <div class="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_260px]">
          <app-report-picker-panel [reports]="reports()" (add)="addReport($event)" />
          <div class="min-w-0 rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-2 dark:border-gray-700 dark:bg-gray-900/30">
            @if (dashboard()!.cards.length === 0) {
              <div class="py-24 text-center text-sm text-gray-400">Add a report from the left panel.</div>
            } @else {
              <app-dashboard-grid [dashboard]="dashboard()!" mode="designer" (layoutChanged)="applyLayout($event)" (remove)="removeCard($event)" (settings)="selectCard($event)" />
            }
          </div>

          <!-- Card Settings panel -->
          <aside class="ta-card h-fit p-4 space-y-4">
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Card Settings</h2>
            @if (selected()) {
              <!-- Title -->
              <div>
                <label class="ta-field-label">Title</label>
                <input [(ngModel)]="titleOverride" class="ta-field" placeholder="Use report name" />
              </div>

              <!-- Show title toggle -->
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="showTitle" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                <span class="text-sm text-gray-700 dark:text-gray-300">Show card title</span>
              </label>

              <!-- Display mode -->
              <div>
                <label class="ta-field-label">Display mode</label>
                <select [(ngModel)]="displayMode" class="ta-field">
                  <option value="chart">Chart only</option>
                  <option value="table">Table only</option>
                  <option value="both">Chart + Table toggle</option>
                </select>
                <p class="mt-1 text-xs text-gray-400">"Chart + Table" shows a toggle button on the card so viewers can switch between the two views.</p>
              </div>

              <!-- Fit content toggle -->
              <div>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="fitContent" class="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                  <span class="text-sm text-gray-700 dark:text-gray-300">Fit content height</span>
                </label>
                <p class="mt-1 text-xs text-gray-400">Card shrinks to wrap its content instead of filling the grid cell. Useful for stat or table cards.</p>
              </div>

              <!-- Custom CSS -->
              <div>
                <label class="ta-field-label">Custom CSS</label>
                <textarea
                  [(ngModel)]="customCss"
                  class="ta-field font-mono text-xs"
                  rows="5"
                  placeholder="background: linear-gradient(135deg, #667eea, #764ba2); color: white;"
                ></textarea>
                <p class="mt-1 text-xs text-gray-400">Applied as inline style on the card wrapper. Use standard CSS properties.</p>
              </div>

              <button type="button" (click)="saveCardSettings()" class="ta-btn ta-btn-primary w-full">Save Card Settings</button>
            } @else {
              <p class="text-xs text-gray-400">Click Settings on a card to customise it.</p>
            }
          </aside>
        </div>
      </div>
    } @else {
      <div class="py-16 text-center text-sm text-gray-400">Loading dashboard designer...</div>
    }
  `,
})
export class DashboardDesignerComponent implements OnInit {
  private dashboards = inject(DashboardService);
  private reportsService = inject(ReportTemplateService);
  private id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  dashboard = signal<Dashboard | null>(null);
  reports = signal<ReportTemplate[]>([]);
  selected = signal<DashboardCard | null>(null);
  saving = signal(false);
  error = signal('');
  message = signal('');

  titleOverride = '';
  showTitle = true;
  fitContent = false;
  customCss = '';
  displayMode: 'chart' | 'table' | 'both' = 'chart';

  ngOnInit(): void {
    this.load();
    this.reportsService.list().subscribe({ next: reports => this.reports.set(reports), error: () => this.error.set('Failed to load reports.') });
  }

  load(): void {
    this.dashboards.get(this.id).subscribe({ next: dashboard => this.dashboard.set(dashboard), error: () => this.error.set('Failed to load dashboard.') });
  }

  addReport(report: ReportTemplate): void {
    const dashboard = this.dashboard();
    if (!dashboard) return;
    this.dashboards.addCard(dashboard.id, { report_id: report.id, x: 0, y: 0, w: 6, h: 4, show_title: true, fit_content: false }).subscribe({
      next: card => this.dashboard.update(value => value ? { ...value, cards: [...value.cards, card] } : value),
      error: () => this.error.set('Failed to add report card.'),
    });
  }

  applyLayout(cards: DashboardCard[]): void {
    this.dashboard.update(value => value ? { ...value, cards } : value);
  }

  selectCard(card: DashboardCard): void {
    this.selected.set(card);
    this.titleOverride = card.title_override ?? '';
    this.showTitle = card.show_title !== false;
    this.fitContent = card.fit_content === true;
    this.customCss = card.custom_css ?? '';
    this.displayMode = card.display_mode ?? 'chart';
  }

  saveLayout(): void {
    const dashboard = this.dashboard();
    if (!dashboard) return;
    this.saving.set(true);
    this.message.set('');
    this.dashboards.saveLayout(dashboard.id, { cards: dashboard.cards.map(card => ({ dashboard_card_id: card.id, x: card.x, y: card.y, w: card.w, h: card.h })) }).subscribe({
      next: () => { this.saving.set(false); this.message.set('Layout saved.'); },
      error: () => { this.saving.set(false); this.error.set('Failed to save layout.'); },
    });
  }

  removeCard(card: DashboardCard): void {
    const dashboard = this.dashboard();
    if (!dashboard) return;
    this.dashboards.deleteCard(dashboard.id, card.id).subscribe({
      next: () => {
        this.dashboard.update(value => value ? { ...value, cards: value.cards.filter(item => item.id !== card.id) } : value);
        if (this.selected()?.id === card.id) this.selected.set(null);
      },
      error: () => this.error.set('Failed to remove report card.'),
    });
  }

  saveCardSettings(): void {
    const dashboard = this.dashboard();
    const card = this.selected();
    if (!dashboard || !card) return;
    this.message.set('');
    const request: SaveDashboardCardRequest = {
      ...card,
      report_id: card.report_id,
      title_override: this.titleOverride || null,
      show_title: this.showTitle,
      fit_content: this.fitContent,
      custom_css: this.customCss || null,
      display_mode: this.displayMode,
    };
    this.dashboards.updateCard(dashboard.id, card.id, request).subscribe({
      next: updated => {
        this.dashboard.update(value => value ? { ...value, cards: value.cards.map(item => item.id === updated.id ? updated : item) } : value);
        this.selected.set(updated);
        this.message.set('Card settings saved.');
      },
      error: () => this.error.set('Failed to save card settings.'),
    });
  }
}
