import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReportTemplate } from '../../../core/models';

@Component({
  selector: 'app-report-picker-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <aside class="ta-card h-full p-4">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Reports</h2>
      <input [ngModel]="query()" (ngModelChange)="query.set($event)" class="ta-admin-control mt-3 w-full px-3 py-2 text-sm" placeholder="Search reports..." />
      <div class="mt-3 space-y-2">
        @for (report of filtered(); track report.id) {
          <button type="button" class="w-full rounded-lg border border-gray-200 p-3 text-left text-sm transition hover:border-indigo-400 dark:border-gray-700 dark:hover:border-indigo-500" (click)="add.emit(report)">
            <span class="block font-medium text-gray-800 dark:text-gray-100">{{ report.name }}</span>
            <span class="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">{{ report.form_name }}</span>
          </button>
        } @empty {
          <p class="py-4 text-center text-xs text-gray-400">No reports found.</p>
        }
      </div>
    </aside>
  `,
})
export class ReportPickerPanelComponent {
  private reportsValue = signal<ReportTemplate[]>([]);
  @Input() set reports(value: ReportTemplate[]) { this.reportsValue.set(value); }
  @Output() add = new EventEmitter<ReportTemplate>();
  query = signal('');

  filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    const reports = this.reportsValue();
    return term ? reports.filter(report => `${report.name} ${report.form_name}`.toLowerCase().includes(term)) : reports;
  });
}
