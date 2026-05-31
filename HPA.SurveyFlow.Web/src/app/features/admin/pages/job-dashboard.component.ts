import {
  Component, OnInit, OnDestroy, signal, inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { interval, Subscription } from 'rxjs';
import { switchMap, startWith } from 'rxjs/operators';
import { JobService } from '../../../core/services/job.service';
import { ScheduledJob, JobRun, TriggerJobParams } from '../../../core/models';

// Parse a Quartz cron expression into a simple human-readable string.
function humanCron(expr: string): string {
  try {
    const parts = expr.trim().split(/\s+/);
    if (parts.length < 6) return expr;
    const [sec, min, hr, dom, mon, dow] = parts;
    if (sec === '0' && min === '0' && hr === '*' && dom === '*') return 'Every hour';
    if (sec === '0' && min === '0' && hr === '0') return 'Daily at midnight';
    if (sec === '0' && min === '*/5') return 'Every 5 minutes';
    if (sec === '0' && min === '*/15') return 'Every 15 minutes';
    if (sec === '0' && min === '*/30') return 'Every 30 minutes';
    if (sec === '0' && hr !== '*' && dom !== '*') return `Daily at ${hr}:${min.padStart(2, '0')}`;
    return expr;
  } catch { return expr; }
}

function durationMs(run: JobRun): number | null {
  if (!run.completed_at) return null;
  return new Date(run.completed_at).getTime() - new Date(run.started_at).getTime();
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

@Component({
  selector: 'app-job-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div>
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Scheduled Jobs</h1>
          <p class="text-sm text-gray-500 mt-0.5">Background jobs • auto-refreshes every 30s</p>
        </div>
        <button type="button" (click)="refresh()"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition">
          ↺ Refresh
        </button>
      </div>

      @if (error()) {
        <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
      }

      @if (loading() && jobs().length === 0) {
        <div class="flex justify-center py-16">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else {
        <div class="space-y-4">
          @for (job of jobs(); track job.job_key) {
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">

              <!-- Job header row -->
              <div class="flex items-center gap-4 px-5 py-4">
                <!-- Status indicator -->
                <div class="w-2.5 h-2.5 rounded-full shrink-0"
                  [class]="job.is_enabled ? 'bg-green-500' : 'bg-gray-300'">
                </div>

                <!-- Name + description -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-gray-900">{{ job.display_name }}</span>
                    <span class="text-xs text-gray-400 font-mono bg-gray-100 rounded px-1.5 py-0.5">{{ job.job_key }}</span>
                    @if (lastRunBadge(job); as badge) {
                      <span class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        [class]="badge.cls">
                        {{ badge.label }}
                      </span>
                    }
                  </div>
                  @if (job.description) {
                    <p class="text-xs text-gray-500 mt-0.5">{{ job.description }}</p>
                  }
                </div>

                <!-- Schedule + last/next run -->
                <div class="text-right shrink-0 hidden sm:block space-y-0.5">
                  <div class="text-xs text-gray-600 font-medium">{{ humanCron(job.cron_expression) }}</div>
                  <div class="text-xs font-mono text-gray-400">{{ job.cron_expression }}</div>
                  @if (job.last_run?.started_at) {
                    <div class="text-xs text-gray-400">Last: {{ formatDate(job.last_run!.started_at) }}</div>
                  }
                  @if (job.next_run_at) {
                    <div class="text-xs text-indigo-500">Next: {{ formatDate(job.next_run_at) }}</div>
                  } @else if (job.is_enabled) {
                    <div class="text-xs text-gray-400">Next: calculating…</div>
                  }
                </div>

                <!-- Actions -->
                <div class="flex items-center gap-2 shrink-0">
                  <!-- Enable/disable toggle -->
                  <button type="button"
                    (click)="toggleEnabled(job)"
                    [disabled]="saving() === job.job_key"
                    [title]="job.is_enabled ? 'Disable job' : 'Enable job'"
                    class="relative inline-flex h-5 w-9 items-center rounded-full transition disabled:opacity-50"
                    [class]="job.is_enabled ? 'bg-indigo-600' : 'bg-gray-300'">
                    <span class="inline-block h-3.5 w-3.5 transform rounded-full bg-white transition"
                      [class]="job.is_enabled ? 'translate-x-4' : 'translate-x-0.5'">
                    </span>
                  </button>
                  <!-- Configure -->
                  <button type="button" (click)="openConfigModal(job)"
                    class="px-2.5 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition">
                    ⚙ Configure
                  </button>
                  <!-- Stop (only when running) -->
                  @if (job.last_run?.status === 'running') {
                    <button type="button"
                      (click)="interruptJob(job)"
                      [disabled]="interrupting() === job.job_key"
                      class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition">
                      @if (interrupting() === job.job_key) {
                        <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                        Stopping…
                      } @else {
                        ■ Stop
                      }
                    </button>
                  }
                  <!-- Run Now -->
                  <button type="button"
                    (click)="openTriggerModal(job)"
                    [disabled]="triggering() === job.job_key || job.last_run?.status === 'running'"
                    class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 transition">
                    @if (triggering() === job.job_key) {
                      <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                      Running…
                    } @else {
                      ▶ Run Now
                    }
                  </button>
                  <!-- History -->
                  <button type="button" (click)="toggleExpanded(job.job_key)"
                    class="px-2.5 py-1 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                    {{ expandedKey() === job.job_key ? '▲ Hide' : '▼ History' }}
                  </button>
                </div>
              </div>

              <!-- Config summary strip -->
              <div class="px-5 pb-3 flex items-center gap-3">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                  [class]="job.sync_mode === 'full' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'">
                  {{ job.sync_mode === 'full' ? 'Full sync every run' : 'Delta (since last run)' }}
                </span>
                @if (job.only_update_changed) {
                  <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    Skip unchanged records
                  </span>
                }
              </div>

              <!-- Run history -->
              @if (expandedKey() === job.job_key) {
                <div class="border-t border-gray-100">
                  @if (runsLoading()) {
                    <div class="px-5 py-4 text-sm text-gray-500">Loading runs…</div>
                  } @else if (expandedRuns().length === 0) {
                    <div class="px-5 py-4 text-sm text-gray-500">No runs yet.</div>
                  } @else {
                    <table class="min-w-full text-xs">
                      <thead class="bg-gray-50">
                        <tr>
                          <th class="px-5 py-2 text-left font-medium text-gray-500">Status</th>
                          <th class="px-5 py-2 text-left font-medium text-gray-500">Started</th>
                          <th class="px-5 py-2 text-left font-medium text-gray-500">Duration</th>
                          <th class="px-5 py-2 text-left font-medium text-gray-500">Trigger</th>
                          <th class="px-5 py-2 text-left font-medium text-gray-500">Result / Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (run of expandedRuns(); track run.id) {
                          <tr class="border-t border-gray-50">
                            <td class="px-5 py-2">
                              @if (run.status === 'success') {
                                <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">✓ Success</span>
                              } @else if (run.status === 'failed') {
                                <span class="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">✗ Failed</span>
                              } @else {
                                <span class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                                  <svg class="w-2.5 h-2.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                                  Running
                                </span>
                              }
                            </td>
                            <td class="px-5 py-2 text-gray-600">{{ formatDate(run.started_at) }}</td>
                            <td class="px-5 py-2 text-gray-600">{{ formatDuration(durationMs(run)) }}</td>
                            <td class="px-5 py-2">
                              <span class="rounded-full px-2 py-0.5"
                                [class]="run.trigger_type === 'manual' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'">
                                {{ run.trigger_type }}{{ run.triggered_by_email ? ' (' + run.triggered_by_email + ')' : '' }}
                              </span>
                            </td>
                            <td class="px-5 py-2 max-w-xs truncate text-gray-600">
                              @if (run.error_message) {
                                <span class="text-red-600" [title]="run.error_message">{{ run.error_message }}</span>
                              } @else if (run.result_summary) {
                                {{ formatResultSummary(run.result_summary) }}
                              } @else { — }
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  }
                </div>
              }
            </div>
          }
        </div>
      }

      <!-- ── Configure job modal ──────────────────────────────────────── -->
      @if (configModalJob()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="w-full max-w-lg bg-white rounded-xl shadow-xl">
            <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 class="text-lg font-semibold text-gray-900">Configure: {{ configModalJob()!.display_name }}</h2>
              <button type="button" (click)="configModalJob.set(null)" class="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div class="px-6 py-5 space-y-5">

              <!-- Schedule -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Schedule</label>
                <div class="flex items-center gap-3">
                  <input type="text" [(ngModel)]="configCron" placeholder="0 0 * * * ?"
                    class="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  <span class="text-xs text-gray-500 shrink-0">{{ humanCron(configCron) }}</span>
                </div>
                <p class="text-xs text-gray-400 mt-1">Quartz cron format: seconds minutes hours day-of-month month day-of-week</p>
              </div>

              <!-- Sync mode -->
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-2">Sync Mode</label>
                <div class="grid grid-cols-2 gap-3">
                  <button type="button" (click)="configSyncMode = 'delta'"
                    [class]="configSyncMode === 'delta'
                      ? 'rounded-lg border-2 border-indigo-500 bg-indigo-50 p-3 text-left'
                      : 'rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50'">
                    <div class="text-sm font-semibold text-gray-900">Delta (recommended)</div>
                    <div class="text-xs text-gray-500 mt-0.5">Each scheduled run fetches only data since the last run. Efficient and fast.</div>
                  </button>
                  <button type="button" (click)="configSyncMode = 'full'"
                    [class]="configSyncMode === 'full'
                      ? 'rounded-lg border-2 border-amber-500 bg-amber-50 p-3 text-left'
                      : 'rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50'">
                    <div class="text-sm font-semibold text-gray-900">Full</div>
                    <div class="text-xs text-gray-500 mt-0.5">Every scheduled run fetches all data from the beginning. Slower but always complete.</div>
                  </button>
                </div>
              </div>

              <!-- Change detection -->
              <div class="rounded-xl border border-gray-200 p-4">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="configOnlyUpdateChanged"
                    class="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <div>
                    <div class="text-sm font-semibold text-gray-800">Skip unchanged records</div>
                    <div class="text-xs text-gray-500 mt-0.5">
                      Only update records where the source system's <code class="bg-gray-100 px-1 rounded">modifiedAt</code> timestamp
                      is newer than our last sync. Requires the API to return a modification timestamp.
                      Reduces database writes significantly for large datasets.
                    </div>
                  </div>
                </label>
              </div>

              <!-- Enable/disable -->
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="configEnabled"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <span class="text-sm font-medium text-gray-700">Enable scheduled runs</span>
                </label>
              </div>
            </div>

            <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button type="button" (click)="configModalJob.set(null)"
                class="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition">Cancel</button>
              <button type="button" (click)="saveConfig()" [disabled]="saving() === configModalJob()?.job_key"
                class="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold transition">
                @if (saving() === configModalJob()?.job_key) { Saving… } @else { Save Configuration }
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ── Trigger parameters modal ──────────────────────────────────── -->
      @if (triggerModalJob()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="w-full max-w-md bg-white rounded-xl shadow-xl p-6">
            <h2 class="text-lg font-semibold text-gray-900 mb-1">Run: {{ triggerModalJob()!.display_name }}</h2>
            <p class="text-xs text-gray-500 mb-5">Choose how to run this job. "Auto" uses the built-in delta logic. "Date range" lets you backfill historical data.</p>

            <!-- Mode selector -->
            <div class="flex gap-3 mb-5">
              <button type="button" (click)="triggerMode = 'auto'"
                [class]="triggerMode === 'auto'
                  ? 'flex-1 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white'
                  : 'flex-1 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50'">
                Auto (delta)
              </button>
              @if (supportsDateRange(triggerModalJob()!)) {
                <button type="button" (click)="triggerMode = 'range'"
                  [class]="triggerMode === 'range'
                    ? 'flex-1 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white'
                    : 'flex-1 py-2 text-sm font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50'">
                  Date Range
                </button>
                <button type="button" (click)="setFullHistorical()"
                  [class]="triggerMode === 'full'
                    ? 'flex-1 py-2 text-sm font-semibold rounded-lg bg-amber-600 text-white'
                    : 'flex-1 py-2 text-sm font-semibold rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50'">
                  Full History
                </button>
              }
            </div>

            @if (triggerMode === 'auto') {
              <div class="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600 mb-5">
                Fetches data since the last successful run. The system automatically adjusts the window size to handle any API record limits.
              </div>
            }

            @if (triggerMode === 'range') {
              <div class="space-y-3 mb-5">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">From date</label>
                    <input type="date" [(ngModel)]="triggerDateFrom"
                      class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">To date</label>
                    <input type="date" [(ngModel)]="triggerDateTo"
                      class="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                </div>
                <div class="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-indigo-700">
                  The system will automatically use adaptive windowing to retrieve all records, handling any API record caps.
                </div>
              </div>
            }

            @if (triggerMode === 'full') {
              <div class="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 mb-4">
                <strong>Full historical backfill</strong> — fetches all data from 2000-01-01 to today.
                The system automatically adjusts window sizes to bypass API record limits.
                This may take a long time for large datasets.
              </div>
              <!-- Purge option — dev/UAT only -->
              <div class="rounded-xl border border-red-200 bg-red-50 p-4 mb-5">
                <label class="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="purgeBeforeSync"
                    class="mt-0.5 h-4 w-4 rounded border-red-400 text-red-600"/>
                  <div>
                    <div class="text-sm font-semibold text-red-800">Delete existing data before sync</div>
                    <div class="text-xs text-red-700 mt-0.5">
                      Removes <strong>all</strong> existing records for this source before fetching fresh data.
                      <strong>Only works in Development and UAT environments.</strong>
                      Production environments will ignore this option.
                    </div>
                  </div>
                </label>
                @if (purgeBeforeSync) {
                  <div class="mt-2 rounded-lg bg-red-100 border border-red-300 px-3 py-2 text-xs font-semibold text-red-900">
                    ⚠ All existing records will be permanently deleted before the new sync runs.
                  </div>
                }
              </div>
            }

            <div class="flex justify-end gap-3 mt-2">
              <button type="button" (click)="triggerModalJob.set(null)"
                class="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition">Cancel</button>
              <button type="button" (click)="confirmTrigger()" [disabled]="triggering() === triggerModalJob()?.job_key"
                class="px-4 py-2 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold transition">
                @if (triggering() === triggerModalJob()?.job_key) { Running… } @else { Run Job }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class JobDashboardComponent implements OnInit, OnDestroy {
  private jobService = inject(JobService);
  private toastr = inject(ToastrService);

  jobs = signal<ScheduledJob[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal<string | null>(null);
  triggering = signal<string | null>(null);
  interrupting = signal<string | null>(null);

  expandedKey = signal<string | null>(null);
  expandedRuns = signal<JobRun[]>([]);
  runsLoading = signal(false);

  editingKey = signal<string | null>(null);
  editCronValue = '';

  // ── Config modal state ─────────────────────────────────────────────────
  configModalJob = signal<ScheduledJob | null>(null);
  configCron = '';
  configSyncMode: 'delta' | 'full' = 'delta';
  configOnlyUpdateChanged = false;
  configEnabled = true;

  // ── Trigger modal state ────────────────────────────────────────────────
  triggerModalJob = signal<ScheduledJob | null>(null);
  triggerMode: 'auto' | 'range' | 'full' = 'auto';
  triggerDateFrom = '';
  triggerDateTo   = new Date().toISOString().split('T')[0];
  purgeBeforeSync = false;

  humanCron = humanCron;
  durationMs = durationMs;
  formatDuration = formatDuration;

  private autoRefreshSub?: Subscription;

  ngOnInit(): void {
    this.autoRefreshSub = interval(30_000).pipe(startWith(0), switchMap(() => this.jobService.getJobs()))
      .subscribe({
        next: (jobs) => { this.jobs.set(jobs); this.loading.set(false); this.error.set(null); },
        error: (err) => { this.loading.set(false); this.error.set(err?.error?.error || 'Failed to load jobs.'); },
      });
  }

  ngOnDestroy(): void { this.autoRefreshSub?.unsubscribe(); }

  refresh(): void {
    this.loading.set(true);
    this.jobService.getJobs().subscribe({
      next: (jobs) => { this.jobs.set(jobs); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  toggleExpanded(key: string): void {
    if (this.expandedKey() === key) { this.expandedKey.set(null); return; }
    this.expandedKey.set(key);
    this.runsLoading.set(true);
    this.jobService.getJobRuns(key, 20).subscribe({
      next: (res) => { this.expandedRuns.set(res.items); this.runsLoading.set(false); },
      error: () => this.runsLoading.set(false),
    });
  }

  toggleEnabled(job: ScheduledJob): void {
    this.saving.set(job.job_key);
    this.jobService.updateJob(job.job_key, { is_enabled: !job.is_enabled }).subscribe({
      next: () => {
        this.saving.set(null);
        this.toastr.success(`Job ${job.is_enabled ? 'disabled' : 'enabled'}.`);
        this.refresh();
      },
      error: (err) => { this.saving.set(null); this.toastr.error(err?.error?.error || 'Failed to update job.'); },
    });
  }

  interruptJob(job: ScheduledJob): void {
    if (!confirm(`Stop "${job.display_name}"? The current run will be cancelled.`)) return;
    this.interrupting.set(job.job_key);
    this.jobService.interruptJob(job.job_key).subscribe({
      next: (res) => {
        this.interrupting.set(null);
        this.toastr.success(res.message);
        setTimeout(() => this.refresh(), 1500);
      },
      error: (err) => {
        this.interrupting.set(null);
        this.toastr.error(err?.error?.error || 'Failed to interrupt job.');
      },
    });
  }

  openTriggerModal(job: ScheduledJob): void {
    this.triggerMode      = 'auto';
    this.triggerDateFrom  = '';
    this.triggerDateTo    = new Date().toISOString().split('T')[0];
    this.purgeBeforeSync  = false;
    this.triggerModalJob.set(job);
  }

  supportsDateRange(job: ScheduledJob): boolean {
    try {
      const schema: string[] = JSON.parse(job.parameter_schema ?? '[]');
      return schema.includes('dateFrom');
    } catch { return false; }
  }

  setFullHistorical(): void {
    this.triggerMode = 'full';
  }

  confirmTrigger(): void {
    const job = this.triggerModalJob();
    if (!job) return;

    let params: TriggerJobParams | undefined;

    if (this.triggerMode === 'range' && this.triggerDateFrom) {
      params = {
        dateFrom: this.triggerDateFrom,
        dateTo:   this.triggerDateTo || undefined,
      };
    } else if (this.triggerMode === 'full') {
      params = {
        fullHistorical:  true,
        purgeBeforeSync: this.purgeBeforeSync || undefined,
      };
    }

    this.triggering.set(job.job_key);
    this.triggerModalJob.set(null);

    this.jobService.triggerJob(job.job_key, params).subscribe({
      next: (res) => {
        this.triggering.set(null);
        this.toastr.success(res.message);
        setTimeout(() => this.refresh(), 2000);
      },
      error: (err) => {
        this.triggering.set(null);
        this.toastr.error(err?.error?.error || 'Failed to trigger job.');
      },
    });
  }

  openConfigModal(job: ScheduledJob): void {
    this.configCron             = job.cron_expression;
    this.configSyncMode         = job.sync_mode ?? 'delta';
    this.configOnlyUpdateChanged = job.only_update_changed ?? false;
    this.configEnabled          = job.is_enabled;
    this.configModalJob.set(job);
  }

  saveConfig(): void {
    const job = this.configModalJob();
    if (!job) return;
    this.saving.set(job.job_key);
    this.jobService.updateJob(job.job_key, {
      cron_expression:      this.configCron,
      is_enabled:           this.configEnabled,
      sync_mode:            this.configSyncMode,
      only_update_changed:  this.configOnlyUpdateChanged,
    }).subscribe({
      next: () => {
        this.saving.set(null);
        this.configModalJob.set(null);
        this.toastr.success('Job configuration saved.');
        this.refresh();
      },
      error: (err) => { this.saving.set(null); this.toastr.error(err?.error?.error || 'Failed to save.'); },
    });
  }

  lastRunBadge(job: ScheduledJob): { label: string; cls: string } | null {
    const r = job.last_run;
    if (!r) return null;
    if (r.status === 'success') return { label: '✓ Last run OK', cls: 'bg-green-100 text-green-800' };
    if (r.status === 'failed') return { label: '✗ Last run failed', cls: 'bg-red-100 text-red-800' };
    if (r.status === 'running') return { label: '⏳ Running', cls: 'bg-blue-100 text-blue-800' };
    return null;
  }

  formatResultSummary(raw: string | null | undefined): string {
    if (!raw) return '—';
    try {
      const obj = JSON.parse(raw);
      if (obj.skipped) return `Skipped: ${obj.reason ?? ''}`;
      if (obj.upserted !== undefined) return `${obj.upserted} assets synced (total: ${obj.total ?? '?'})`;
      return raw;
    } catch { return raw; }
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleString(); } catch { return dateStr; }
  }
}
