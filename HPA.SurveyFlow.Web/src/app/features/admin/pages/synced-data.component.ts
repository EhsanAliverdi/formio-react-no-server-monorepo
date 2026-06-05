import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService, ExternalAsset, AssetTreeNode, MexRequestRecord } from '../../../core/services/job.service';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';
import { getFieldMap } from '../../../core/utils/field-maps/source-field-map.registry';
import { renderGroups, RenderedGroup } from '../../../core/utils/field-maps/field-renderer';

type ViewLevel = 'integrations' | 'data-types' | 'records';

interface Integration {
  key: string;
  label: string;
  description: string;
  connected: boolean;
  dataTypes: DataType[];
}

interface DataType {
  key: string;
  label: string;
  description: string;
  icon: string;
  available: boolean;
}

const INTEGRATIONS: Integration[] = [
  {
    key: 'mex',
    label: 'MEX',
    description: 'Maintenance management system. Syncs asset hierarchy and tracks requests created by SurveyFlow.',
    connected: true,
    dataTypes: [
      {
        key: 'assets',
        label: 'Assets',
        description: 'Equipment and asset hierarchy synced from MEX.',
        icon: 'asset',
        available: true,
      },
      {
        key: 'requests',
        label: 'Requests',
        description: 'Planned — work order sync coming soon.',
        icon: 'work-order',
        available: true,
      },
    ],
  },
];

@Component({
  selector: 'app-synced-data',
  standalone: true,
  imports: [CommonModule, FormsModule, HelpTriggerComponent],
  template: `
    <div>
      <!-- Header + breadcrumb -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <nav class="flex items-center gap-1.5 text-sm mb-1">
            <button type="button" (click)="goTo('integrations')"
              class="font-medium"
              [class]="level() === 'integrations'
                ? 'text-gray-900 dark:text-white cursor-default'
                : 'text-indigo-600 dark:text-indigo-400 hover:underline'">
              Synced Data
            </button>
            @if (level() !== 'integrations') {
              <span class="text-gray-400">/</span>
              <button type="button" (click)="goTo('data-types')"
                class="font-medium"
                [class]="level() === 'data-types'
                  ? 'text-gray-900 dark:text-white cursor-default'
                  : 'text-indigo-600 dark:text-indigo-400 hover:underline'">
                {{ activeIntegration()?.label }}
              </button>
            }
            @if (level() === 'records') {
              <span class="text-gray-400">/</span>
              <span class="text-gray-900 dark:text-white font-medium">{{ activeDataType()?.label }}</span>
            }
          </nav>
          @if (level() === 'integrations') {
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Synced Data <app-help-trigger helpKey="admin.synced-data.list" label="Synced data help" />
            </h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Browse records by integration source.</p>
          } @else if (level() === 'data-types') {
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ activeIntegration()?.label }}</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ activeIntegration()?.description }}</p>
          } @else {
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ activeDataType()?.label }}</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{{ activeDataType()?.description }}</p>
          }
        </div>
        @if (level() === 'records') {
          <button type="button" (click)="load()" [disabled]="loading()"
            class="ta-btn ta-btn-secondary px-3 py-1.5">
            ↺ Refresh
          </button>
        }
      </div>

      <!-- ── Level 1: Integration cards ───────────────────────────────── -->
      @if (level() === 'integrations') {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (integration of integrations; track integration.key) {
            <button type="button" (click)="selectIntegration(integration)"
              class="ta-admin-surface p-5 text-left hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700 transition group cursor-pointer">
              <div class="flex items-start justify-between mb-3">
                <div class="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                  <svg class="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                  </svg>
                </div>
                <span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  [class]="integration.connected
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'">
                  <span class="w-1.5 h-1.5 rounded-full"
                    [class]="integration.connected ? 'bg-green-500' : 'bg-gray-400'"></span>
                  {{ integration.connected ? 'Connected' : 'Not connected' }}
                </span>
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition">
                {{ integration.label }}
              </h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ integration.description }}</p>
              <div class="mt-3 text-xs text-gray-400 dark:text-gray-500">{{ integration.dataTypes.length }} data type(s)</div>
            </button>
          }
        </div>
      }

      <!-- ── Level 2: Data type cards ─────────────────────────────────── -->
      @if (level() === 'data-types') {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (dt of activeIntegration()!.dataTypes; track dt.key) {
            <button type="button" (click)="selectDataType(dt)" [disabled]="!dt.available"
              class="ta-admin-surface p-5 text-left transition disabled:opacity-55 disabled:cursor-not-allowed"
              [class]="dt.available ? 'hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-700 cursor-pointer group' : ''">
              <div class="flex items-start justify-between mb-3">
                <div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  [class]="dt.available
                    ? 'bg-indigo-100 dark:bg-indigo-900/40'
                    : 'bg-gray-100 dark:bg-gray-700'">
                  @if (dt.icon === 'asset') {
                    <svg class="w-5 h-5" [class]="dt.available ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                    </svg>
                  } @else {
                    <svg class="w-5 h-5" [class]="dt.available ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                    </svg>
                  }
                </div>
                @if (!dt.available) {
                  <span class="rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">Planned</span>
                } @else {
                  <span class="text-2xl font-bold text-indigo-700 dark:text-indigo-400">{{ recordCount(dt.key) | number }}</span>
                }
              </div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white"
                [class]="dt.available ? 'group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition' : ''">
                {{ dt.label }}
              </h2>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ dataTypeDescription(dt) }}</p>
              @if (dt.available) {
                <div class="mt-3 text-xs text-gray-400 dark:text-gray-500">{{ dataTypeTimestampLabel(dt) }}: {{ formatDate(dataTypeTimestamp(dt)) }}</div>
              }
            </button>
          }
        </div>
      }

      <!-- ── Level 3: Records view ─────────────────────────────────────── -->
      @if (level() === 'records') {
        @if (isRequestsView()) {
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div class="ta-admin-surface p-4">
              <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Requests</div>
              <div class="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{{ requestTotal() | number }}</div>
              <div class="mt-1 text-xs text-gray-400 dark:text-gray-500">Latest created: {{ formatDate(requestLastCreatedAt()) }}</div>
            </div>
          </div>

          <div class="flex flex-wrap gap-3 mb-4">
            <input type="search" [(ngModel)]="filterQ" (ngModelChange)="onSearch()"
              placeholder="Search request, form, rule, submission..."
              class="ta-admin-control flex-1 min-w-48 px-3 py-1.5 text-sm"/>
            <select [(ngModel)]="requestStatus" (ngModelChange)="load()" aria-label="Filter by request status"
              class="ta-admin-control px-3 py-1.5 text-sm">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <div class="text-sm text-gray-500 dark:text-gray-400 self-center ml-auto">
              {{ loading() ? 'Loading...' : requests().length + ' of ' + requestTotal() + ' request(s)' }}
            </div>
          </div>

          @if (error()) {
            <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
          }

          <div class="ta-admin-surface overflow-hidden">
            <div class="overflow-x-auto">
              <table class="min-w-full text-sm">
                <thead class="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Request</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Form</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 w-28">Terminal</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 w-28">Status</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Created</th>
                  </tr>
                </thead>
                <tbody>
                  @if (loading()) {
                    <tr><td colspan="5" class="px-5 py-8 text-center text-gray-500">
                      <div class="flex justify-center">
                        <div class="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    </td></tr>
                  } @else if (requests().length === 0) {
                    <tr><td colspan="5" class="px-5 py-8 text-center text-gray-500">
                      No requests found. Submitted forms that create MEX requests will appear here.
                    </td></tr>
                  } @else {
                    @for (request of requests(); track request.id) {
                      <tr class="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/70 dark:hover:bg-gray-700/60 transition">
                        <td class="px-4 py-3">
                          <div class="font-semibold text-gray-900 dark:text-white">{{ request.request_number || 'Pending reference' }}</div>
                          <div class="mt-0.5 text-xs text-gray-500">
                            Submission #{{ request.submission_id }} · {{ request.rule_name }}
                          </div>
                          @if (request.error_message) {
                            <div class="mt-1 text-xs text-red-600">{{ request.error_message }}</div>
                          }
                        </td>
                        <td class="px-4 py-3 text-gray-700 dark:text-gray-200">{{ request.form_name }}</td>
                        <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ request.terminal_code || 'All' }}</td>
                        <td class="px-4 py-3">
                          <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            [class]="request.status === 'success'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              : request.status === 'failed'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'">
                            {{ request.status }}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ formatDate(request.triggered_at) }}</td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>
          </div>
        } @else {

        <!-- Stat + action cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <!-- Record count card -->
          <div class="ta-admin-surface p-4">
            <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Records</div>
            <div class="text-3xl font-bold text-indigo-700 dark:text-indigo-400">{{ sources()[0]?.count?.toLocaleString() ?? '0' }}</div>
            <div class="mt-1 text-xs text-gray-400 dark:text-gray-500">Last synced: {{ formatDate(lastSynced()) }}</div>
          </div>

          <!-- Sync by ID card -->
          <div class="ta-admin-surface p-4">
            <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Sync Asset by ID</div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Fetch one asset and any missing parents directly from {{ activeIntegration()?.label }}.</p>
            <div class="flex items-center gap-2 mb-2">
              <input type="text" [(ngModel)]="syncOneId" placeholder="e.g. 10939"
                (keydown.enter)="syncOne()"
                class="ta-admin-control flex-1 min-w-0 px-3 py-1.5 text-sm font-mono"/>
              <button type="button" (click)="syncOne()" [disabled]="syncingOne() || !syncOneId.trim()"
                class="ta-btn ta-btn-primary px-3 py-1.5 text-sm shrink-0">
                {{ syncingOne() ? 'Syncing…' : 'Sync' }}
              </button>
            </div>
            @if (syncOneResult()) {
              <div class="rounded-lg border p-2.5 text-xs mt-2"
                [class]="syncOneResult()!.success
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'">
                <div class="font-semibold mb-1"
                  [class]="syncOneResult()!.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'">
                  {{ syncOneResult()!.success ? 'Synced ' + syncOneResult()!.total_synced + ' record(s)' : 'Failed' }}
                </div>
                @for (r of syncOneResult()!.records; track r.external_id) {
                  <div class="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <span class="font-mono">{{ r.external_id }}</span>
                    <span class="text-gray-500">{{ r.display_name ?? '' }}</span>
                    <span class="text-gray-400">({{ r.status }})</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Gap fill card -->
          <div class="ta-admin-surface p-4">
            <div class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Gap Fill</div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
              Finds numeric ID gaps in the synced range and fetches every missing asset.
              Runs as a background job — monitor in <strong>Jobs</strong>.
            </p>
            <button type="button" (click)="runBestEffort()" [disabled]="bestEffortRunning()"
              class="ta-btn ta-btn-secondary px-3 py-1.5 text-sm">
              {{ bestEffortRunning() ? 'Triggering…' : 'Run gap fill' }}
            </button>
            @if (bestEffortResult()) {
              <p class="mt-2 text-xs text-green-700 dark:text-green-400">{{ bestEffortResult()!.message }}</p>
            }
          </div>
        </div>

        <!-- Filter bar -->
        <div class="flex flex-wrap gap-3 mb-4">
          <input type="search" [(ngModel)]="filterQ" (ngModelChange)="onSearch()"
            placeholder="Search name, ID, category…"
            class="ta-admin-control flex-1 min-w-48 px-3 py-1.5 text-sm"/>
          <select [(ngModel)]="filterActive" (ngModelChange)="load()" aria-label="Filter by status"
            class="ta-admin-control px-3 py-1.5 text-sm">
            <option value="">Active & inactive</option>
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
          </select>
          <button type="button" (click)="expandAll()" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs">Expand all</button>
          <button type="button" (click)="collapseAll()" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs">Collapse all</button>
          <div class="text-sm text-gray-500 dark:text-gray-400 self-center ml-auto">
            {{ loading() ? 'Loading…' : visibleNodes().length + ' of ' + nodes().length + ' record(s)' }}
          </div>
        </div>

        @if (error()) {
          <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
        }

        <!-- Tree table -->
        <div class="ta-admin-surface overflow-hidden">
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300">Name</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 w-28">ID</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 w-36">Category</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 w-28">Location</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-300 w-20">Status</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-500 w-20"></th>
                </tr>
              </thead>
              <tbody>
                @if (loading()) {
                  <tr><td colspan="6" class="px-5 py-8 text-center text-gray-500">
                    <div class="flex justify-center">
                      <div class="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td></tr>
                } @else if (visibleNodes().length === 0) {
                  <tr><td colspan="6" class="px-5 py-8 text-center text-gray-500">
                    No records found. Run a sync job to populate data.
                  </td></tr>
                } @else {
                  @for (node of visibleNodes(); track node.id) {
                    <tr class="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50/70 dark:hover:bg-gray-700/60 transition"
                      [class.opacity-50]="!node.is_active">
                      <td class="px-4 py-2">
                        <div class="flex items-center" [style.padding-left.px]="node.depth * 20">
                          @if (node.has_children) {
                            <button type="button" (click)="toggleNode(node.external_id); $event.stopPropagation()"
                              class="w-5 h-5 mr-1.5 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0 transition">
                              {{ collapsed().has(node.external_id) ? '▸' : '▾' }}
                            </button>
                          } @else {
                            <span class="w-5 h-5 mr-1.5 shrink-0"></span>
                          }
                          <span class="mr-2 shrink-0">
                            @if (node.has_children) {
                              <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                              </svg>
                            } @else {
                              <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                              </svg>
                            }
                          </span>
                          <span class="font-medium text-gray-800 dark:text-gray-100 truncate max-w-xs"
                            [class.font-semibold]="node.is_match && !!filterQ">
                            {{ node.display_name }}
                          </span>
                          @if (node.has_children) {
                            <span class="ml-1.5 text-xs text-gray-500">({{ node.child_count }})</span>
                          }
                        </div>
                      </td>
                      <td class="px-4 py-2 font-mono text-xs text-gray-500 dark:text-gray-400">{{ node.external_id }}</td>
                      <td class="px-4 py-2 text-gray-600 dark:text-gray-300 text-xs">{{ node.category ?? '—' }}</td>
                      <td class="px-4 py-2 text-gray-600 dark:text-gray-300 text-xs">{{ node.location ?? '—' }}</td>
                      <td class="px-4 py-2">
                        @if (node.is_active) {
                          <span class="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-400">Active</span>
                        } @else {
                          <span class="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-300">Inactive</span>
                        }
                      </td>
                      <td class="px-4 py-2">
                        <button type="button" (click)="openDetail(node)"
                          class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                          Details
                        </button>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        </div>
        }
      }

      <!-- ── Detail modal ──────────────────────────────────────────────── -->
      @if (selectedAsset()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
            <div class="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div class="min-w-0">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ selectedAsset()!.display_name }}</h3>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <span class="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                    {{ activeIntegration()?.label }}
                  </span>
                  <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">ID: {{ selectedAsset()!.external_id }}</span>
                  @if (selectedAsset()!.parent_external_id) {
                    <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">Parent: {{ selectedAsset()!.parent_external_id }}</span>
                  }
                  @if (selectedAsset()!.is_active) {
                    <span class="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-400">Active</span>
                  } @else {
                    <span class="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-300">Inactive</span>
                  }
                </div>
              </div>
              <button type="button" (click)="selectedAsset.set(null)"
                class="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-xl leading-none ml-4 shrink-0">✕</button>
            </div>

            <div class="flex border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900 shrink-0">
              <button type="button" (click)="detailTab = 'overview'"
                [class]="detailTab === 'overview'
                  ? 'px-5 py-3 text-sm font-semibold text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-600 bg-white dark:bg-gray-800'
                  : 'px-5 py-3 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'">
                Overview
              </button>
              <button type="button" (click)="detailTab = 'raw'"
                [class]="detailTab === 'raw'
                  ? 'px-5 py-3 text-sm font-semibold text-indigo-700 dark:text-indigo-300 border-b-2 border-indigo-600 bg-white dark:bg-gray-800'
                  : 'px-5 py-3 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'">
                Raw JSON
              </button>
            </div>

            <div class="flex-1 overflow-y-auto">
              @if (rawLoading()) {
                <div class="flex justify-center py-12">
                  <div class="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              } @else if (detailTab === 'overview') {
                @if (renderedGroups().length === 0) {
                  <div class="px-6 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                    No field mapping available. Switch to Raw JSON to view data.
                  </div>
                } @else {
                  <div class="divide-y divide-gray-100 dark:divide-gray-700">
                    @for (group of renderedGroups(); track group.title) {
                      <div class="px-6 py-4">
                        <h4 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{{ group.title }}</h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                          @for (field of group.fields; track field.label) {
                            <div>
                              <dt class="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{{ field.label }}</dt>
                              @if (field.type === 'multiline') {
                                <dd class="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{{ field.value }}</dd>
                              } @else if (field.type === 'boolean') {
                                <dd class="text-sm">
                                  @if (field.value === 'Yes') {
                                    <span class="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Yes</span>
                                  } @else {
                                    <span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">No</span>
                                  }
                                </dd>
                              } @else {
                                <dd class="text-sm text-gray-800 dark:text-gray-200 font-medium">{{ field.value }}</dd>
                              }
                            </div>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }
              } @else {
                <div class="p-6">
                  <pre class="text-xs text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap leading-relaxed">{{ rawJson() }}</pre>
                </div>
              }
            </div>

            <div class="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
              <span class="text-xs text-gray-500 dark:text-gray-400">Last synced: {{ formatDate(selectedAsset()!.last_synced_at) }}</span>
              <div class="flex items-center gap-2">
                <button type="button" (click)="syncOneFromDetail()" [disabled]="syncingOne()"
                  class="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition">
                  @if (syncingOne()) {
                    <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    Syncing…
                  } @else {
                    ↓ Re-sync this asset
                  }
                </button>
                <button type="button" (click)="selectedAsset.set(null)" class="ta-btn ta-btn-secondary px-4 py-2">Close</button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class SyncedDataComponent implements OnInit {
  private jobService = inject(JobService);

  readonly integrations = INTEGRATIONS;

  level             = signal<ViewLevel>('integrations');
  activeIntegration = signal<Integration | null>(null);
  activeDataType    = signal<DataType | null>(null);

  syncOneId     = '';
  syncingOne    = signal(false);
  syncOneResult = signal<any>(null);

  bestEffortRunning = signal(false);
  bestEffortResult  = signal<any>(null);

  nodes      = signal<AssetTreeNode[]>([]);
  requests   = signal<MexRequestRecord[]>([]);
  requestTotal = signal(0);
  requestLastCreatedAt = signal<string | null>(null);
  loading    = signal(false);
  error      = signal<string | null>(null);
  sources    = signal<{ source: string; count: number; last_synced_at: string }[]>([]);
  categories = signal<string[]>([]);
  collapsed  = signal<Set<string>>(new Set());

  filterQ      = '';
  filterActive = '';
  requestStatus = '';

  selectedAsset  = signal<ExternalAsset | null>(null);
  rawLoading     = signal(false);
  rawJson        = signal('');
  detailTab: 'overview' | 'raw' = 'overview';
  renderedGroups = signal<RenderedGroup[]>([]);

  lastSynced = computed(() => this.sources()[0]?.last_synced_at ?? null);

  visibleNodes = computed(() => {
    const col = this.collapsed();
    if (col.size === 0) return this.nodes();
    const hidden = new Set<string>();
    return this.nodes().filter(node => {
      const pid = node.parent_external_id;
      if (pid && (col.has(pid) || hidden.has(pid))) {
        hidden.add(node.external_id);
        return false;
      }
      return true;
    });
  });

  private searchTimer: any;

  ngOnInit(): void {
    // Pre-load sources summary so data-type cards show counts before drilling in
    this.jobService.getAssetTree({ source: 'mex' }).subscribe({
      next: (res) => this.sources.set(res.sources),
      error: () => {},
    });
    this.loadRequestSummary();
  }

  goTo(level: ViewLevel): void {
    if (level === 'integrations') {
      this.level.set('integrations');
      this.activeIntegration.set(null);
      this.activeDataType.set(null);
    } else if (level === 'data-types') {
      this.level.set('data-types');
      this.activeDataType.set(null);
    }
  }

  selectIntegration(integration: Integration): void {
    this.activeIntegration.set(integration);
    this.level.set('data-types');
  }

  selectDataType(dt: DataType): void {
    if (!dt.available) return;
    this.activeDataType.set(dt);
    this.level.set('records');
    this.filterQ = '';
    this.filterActive = '';
    this.requestStatus = '';
    this.syncOneResult.set(null);
    this.bestEffortResult.set(null);
    this.load();
  }

  recordCount(dtKey: string): number {
    if (dtKey === 'requests') return this.requestTotal();
    if (dtKey !== 'assets') return 0;
    return this.sources().find(s => s.source === this.activeIntegration()?.key)?.count ?? 0;
  }

  dataTypeDescription(dt: DataType): string {
    return dt.key === 'requests' ? 'MEX maintenance requests created by SurveyFlow submissions.' : dt.description;
  }

  dataTypeTimestampLabel(dt: DataType): string {
    return dt.key === 'requests' ? 'Latest created' : 'Last synced';
  }

  dataTypeTimestamp(dt: DataType): string | null {
    return dt.key === 'requests' ? this.requestLastCreatedAt() : this.lastSynced();
  }

  isRequestsView(): boolean {
    return this.activeDataType()?.key === 'requests';
  }

  load(): void {
    if (this.isRequestsView()) {
      this.loadRequests();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.jobService.getAssetTree({
      source:   this.activeIntegration()?.key,
      q:        this.filterQ      || undefined,
      isActive: this.filterActive ? this.filterActive === 'true' : undefined,
    }).subscribe({
      next: (res) => {
        this.nodes.set(res.nodes);
        this.sources.set(res.sources);
        this.categories.set(res.categories);
        this.loading.set(false);
        if (this.filterQ) {
          this.collapsed.set(new Set());
        } else {
          this.collapsed.set(new Set(res.nodes.filter(n => n.has_children).map(n => n.external_id)));
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to load data.');
      },
    });
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 350);
  }

  private loadRequestSummary(): void {
    this.jobService.getMexRequests({ limit: 1 }).subscribe({
      next: (res) => {
        this.requestTotal.set(res.total ?? 0);
        this.requestLastCreatedAt.set(res.last_created_at ?? null);
      },
      error: () => {},
    });
  }

  private loadRequests(): void {
    this.loading.set(true);
    this.error.set(null);
    this.jobService.getMexRequests({
      q: this.filterQ || undefined,
      status: this.requestStatus || undefined,
      limit: 100,
      offset: 0,
    }).subscribe({
      next: (res) => {
        this.requests.set(res.items ?? []);
        this.requestTotal.set(res.total ?? 0);
        this.requestLastCreatedAt.set(res.last_created_at ?? null);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to load requests.');
      },
    });
  }

  toggleNode(externalId: string): void {
    const col = new Set(this.collapsed());
    if (col.has(externalId)) col.delete(externalId); else col.add(externalId);
    this.collapsed.set(col);
  }

  expandAll(): void { this.collapsed.set(new Set()); }

  collapseAll(): void {
    this.collapsed.set(new Set(this.nodes().filter(n => n.has_children).map(n => n.external_id)));
  }

  openDetail(node: AssetTreeNode): void {
    this.selectedAsset.set(node);
    this.detailTab = 'overview';
    this.rawLoading.set(true);
    this.rawJson.set('');
    this.renderedGroups.set([]);
    this.jobService.getAdminAsset(node.id).subscribe({
      next: (detail) => {
        this.rawLoading.set(false);
        const raw = detail.raw ?? {};
        this.rawJson.set(JSON.stringify(raw, null, 2));
        const fieldMap = getFieldMap(node.source);
        if (fieldMap.length > 0 && typeof raw === 'object')
          this.renderedGroups.set(renderGroups(raw as Record<string, unknown>, fieldMap));
      },
      error: () => { this.rawLoading.set(false); this.rawJson.set('Failed to load raw data.'); },
    });
  }

  syncOne(id?: string): void {
    const externalId = (id ?? this.syncOneId).trim();
    if (!externalId || this.syncingOne()) return;
    this.syncingOne.set(true);
    this.syncOneResult.set(null);
    this.jobService.syncOneAsset(externalId).subscribe({
      next: (res) => {
        this.syncingOne.set(false);
        this.syncOneResult.set(res);
        if (res.total_synced > 0) this.load();
      },
      error: (err) => {
        this.syncingOne.set(false);
        this.syncOneResult.set({ success: false, total_synced: 0, records: [{ external_id: externalId, status: 'error', error: err?.error?.error || 'Request failed', saved: false }] });
      },
    });
  }

  runBestEffort(): void {
    if (this.bestEffortRunning()) return;
    this.bestEffortRunning.set(true);
    this.bestEffortResult.set(null);
    this.jobService.bestEffortSync().subscribe({
      next: (res) => { this.bestEffortRunning.set(false); this.bestEffortResult.set(res); },
      error: (err) => {
        this.bestEffortRunning.set(false);
        this.bestEffortResult.set({ success: false, message: err?.error?.error || 'Failed to trigger gap fill.' });
      },
    });
  }

  syncOneFromDetail(): void {
    const asset = this.selectedAsset();
    if (!asset) return;
    this.syncOne(asset.external_id);
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    try { return new Date(dateStr).toLocaleString(); } catch { return dateStr; }
  }
}
