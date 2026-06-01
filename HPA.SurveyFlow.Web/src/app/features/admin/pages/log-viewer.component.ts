import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LogService, LogEntry } from '../../../core/services/log.service';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';

const LEVELS = ['', 'Verbose', 'Debug', 'Information', 'Warning', 'Error', 'Fatal'];

const LEVEL_STYLE: Record<string, string> = {
  Fatal:       'bg-purple-100 text-purple-900 dark:bg-purple-900/30 dark:text-purple-400',
  Error:       'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  Warning:     'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  Information: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  Debug:       'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  Verbose:     'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
};

const ROW_STYLE: Record<string, string> = {
  Fatal:   'border-l-2 border-purple-400 bg-purple-50/30 dark:bg-purple-900/20',
  Error:   'border-l-2 border-red-400 bg-red-50/30 dark:bg-red-900/20',
  Warning: 'border-l-2 border-amber-400 bg-amber-50/30 dark:bg-amber-900/20',
};

@Component({
  selector: 'app-log-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, HelpTriggerComponent],
  template: `
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Log Viewer <app-help-trigger helpKey="admin.logs.list" label="Log viewer help" /></h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Browse and filter application logs.</p>
          @if (logFile()) {
            <p class="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{{ logFile() }}</p>
          }
        </div>
        <button type="button" (click)="load()" [disabled]="loading()"
          class="ta-btn ta-btn-secondary px-3 py-1.5">
          @if (loading()) {
            <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
          }
          ↺ Refresh
        </button>
      </div>

      <!-- Filters -->
      <div class="flex flex-wrap gap-3 mb-4">
        <!-- Level filter -->
        <select [(ngModel)]="filterLevel" (ngModelChange)="load()" aria-label="Log level"
          class="ta-admin-control px-3 py-1.5 text-sm">
          @for (lvl of levels; track lvl) {
            <option [value]="lvl">{{ lvl || 'All levels' }}</option>
          }
        </select>

        <!-- Date picker -->
        <select [(ngModel)]="filterDate" (ngModelChange)="load()" aria-label="Log date"
          class="ta-admin-control px-3 py-1.5 text-sm">
          @for (f of files(); track f.name) {
            <option [value]="f.date">{{ f.date }} ({{ formatBytes(f.size_bytes) }})</option>
          }
          @if (files().length === 0) {
            <option value="">Today</option>
          }
        </select>

        <!-- Limit -->
        <select [(ngModel)]="filterLimit" (ngModelChange)="load()" aria-label="Log limit"
          class="ta-admin-control px-3 py-1.5 text-sm">
          <option value="100">Last 100</option>
          <option value="200">Last 200</option>
          <option value="500">Last 500</option>
          <option value="1000">Last 1000</option>
        </select>

        <!-- Search -->
        <input type="search" [(ngModel)]="filterQ" (ngModelChange)="onSearch()"
          placeholder="Search messages, correlation ID…"
          class="ta-admin-control flex-1 min-w-48 px-3 py-1.5 text-sm"/>

        <!-- Stats -->
        <div class="ml-auto flex items-center gap-3 text-xs text-gray-500">
          <span class="text-red-600 font-medium">{{ countLevel('Error') + countLevel('Fatal') }} errors</span>
          <span class="text-amber-600 font-medium">{{ countLevel('Warning') }} warnings</span>
          <span>{{ entries().length }} shown</span>
        </div>
      </div>

      @if (error()) {
        <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
      }

      <!-- Log table -->
      <div class="ta-admin-surface overflow-hidden">
        @if (loading() && entries().length === 0) {
          <div class="flex justify-center py-12">
            <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        } @else if (entries().length === 0) {
          <div class="px-5 py-8 text-sm text-gray-500 text-center">No log entries found.</div>
        } @else {
          <div class="overflow-x-auto">
            <table class="min-w-full text-xs font-mono">
              <thead class="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th scope="col" class="px-4 py-2 text-left font-semibold text-gray-500 dark:text-gray-300 w-36">Time</th>
                  <th scope="col" class="px-4 py-2 text-left font-semibold text-gray-500 dark:text-gray-300 w-24">Level</th>
                  <th scope="col" class="px-4 py-2 text-left font-semibold text-gray-500 dark:text-gray-300 w-32">Correlation</th>
                  <th scope="col" class="px-4 py-2 text-left font-semibold text-gray-500 dark:text-gray-300">Message</th>
                </tr>
              </thead>
              <tbody>
                @for (entry of entries(); track $index) {
                  <tr class="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-700/60 transition"
                    [class]="rowStyle(entry.level)">
                    <td class="px-4 py-1.5 text-gray-500 dark:text-gray-400 whitespace-nowrap">{{ formatTime(entry.timestamp) }}</td>
                    <td class="px-4 py-1.5">
                      <span class="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                        [class]="levelStyle(entry.level)">
                        {{ entry.level }}
                      </span>
                    </td>
                    <td class="px-4 py-1.5 text-gray-500 dark:text-gray-400 truncate max-w-[8rem]" [title]="entry.correlation_id ?? ''">
                      {{ entry.correlation_id ?? '—' }}
                    </td>
                    <td class="px-4 py-1.5">
                      <div class="text-gray-800 dark:text-gray-200 break-all">{{ entry.message }}</div>
                      @if (entry.exception) {
                        <details class="mt-0.5">
                          <summary class="cursor-pointer text-red-600 hover:text-red-800 text-[10px]">Exception ▼</summary>
                          <pre class="mt-1 whitespace-pre-wrap text-red-700 dark:text-red-300 text-[10px] bg-red-50 dark:bg-red-900/20 rounded p-2 max-h-40 overflow-y-auto">{{ entry.exception }}</pre>
                        </details>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
})
export class LogViewerComponent implements OnInit {
  private logService = inject(LogService);

  entries = signal<LogEntry[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  logFile = signal<string | null>(null);
  files = signal<{ name: string; date: string; size_bytes: number }[]>([]);

  filterLevel = '';
  filterDate = '';
  filterLimit = 200;
  filterQ = '';

  levels = LEVELS;

  private searchTimer: any;

  ngOnInit(): void {
    this.logService.getFiles().subscribe({
      next: (res) => {
        this.files.set(res.files);
        if (res.files.length > 0) this.filterDate = res.files[0].date;
        this.load();
      },
      error: () => this.load(),
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.logService.getLogs({
      level: this.filterLevel || undefined,
      q: this.filterQ || undefined,
      limit: this.filterLimit,
      date: this.filterDate || undefined,
    }).subscribe({
      next: (res) => {
        this.entries.set(res.items);
        this.logFile.set(res.log_file);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to load logs.');
      },
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 400);
  }

  countLevel(lvl: string): number {
    return this.entries().filter(e => e.level === lvl).length;
  }

  levelStyle(level: string): string {
    return LEVEL_STYLE[level] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  }

  rowStyle(level: string): string {
    return ROW_STYLE[level] ?? '';
  }

  formatTime(ts: string | null | undefined): string {
    if (!ts) return '—';
    try { return new Date(ts).toLocaleTimeString(); } catch { return ts; }
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  }
}
