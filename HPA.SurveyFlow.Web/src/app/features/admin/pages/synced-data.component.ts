import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService, ExternalAsset, AssetTreeNode } from '../../../core/services/job.service';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';
import { getFieldMap } from '../../../core/utils/field-maps/source-field-map.registry';
import { renderGroups, RenderedGroup } from '../../../core/utils/field-maps/field-renderer';

const SOURCE_LABEL: Record<string, string> = {
  mex: 'MEX Maintenance',
};

@Component({
  selector: 'app-synced-data',
  standalone: true,
  imports: [CommonModule, FormsModule, HelpTriggerComponent],
  template: `
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Synced Integration Data <app-help-trigger helpKey="admin.synced-data.list" label="Synced data help" /></h1>
          <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Assets and records pulled from connected integrations</p>
        </div>
        <button type="button" (click)="load()" [disabled]="loading()"
          class="ta-btn ta-btn-secondary px-3 py-1.5">
          ↺ Refresh
        </button>
      </div>

      <!-- Sync single asset -->
      <div class="ta-admin-surface mb-6 p-4">
        <div class="flex items-start gap-3">
          <div class="flex-1">
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Sync Asset by ID</label>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">Enter an external asset ID to fetch it and all its parent assets directly from the integration.</p>
            <div class="flex items-center gap-2">
              <input type="text" [(ngModel)]="syncOneId" placeholder="e.g. 10939"
                (keydown.enter)="syncOne()"
                class="ta-admin-control w-48 px-3 py-1.5 text-sm font-mono"/>
              <button type="button" (click)="syncOne()" [disabled]="syncingOne() || !syncOneId.trim()"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition">
                @if (syncingOne()) {
                  <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  Syncing…
                } @else {
                  ↓ Sync
                }
              </button>
            </div>
          </div>
          <!-- Result -->
          @if (syncOneResult()) {
            <div class="flex-1 rounded-lg border p-3 text-xs"
              [class]="syncOneResult()!.success ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'">
              <div class="font-semibold mb-1"
                [class]="syncOneResult()!.success ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'">
                {{ syncOneResult()!.success ? '✓ Synced ' + syncOneResult()!.total_synced + ' record(s)' : '✗ Failed' }}
              </div>
              @for (r of syncOneResult()!.records; track r.external_id) {
                <div class="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                  <span [class]="r.status === 'error' ? 'text-red-600' : 'text-green-700'">
                    {{ r.status === 'error' ? '✗' : '✓' }}
                  </span>
                  <span class="font-mono">{{ r.external_id }}</span>
                  <span class="text-gray-500 dark:text-gray-400">{{ r.display_name ?? '' }}</span>
                  <span class="text-gray-500 dark:text-gray-400">({{ r.status }})</span>
                </div>
              }
            </div>
          }
        </div>
      </div>

      <!-- Best-effort gap fill -->
      <div class="ta-admin-surface mb-4 p-4">
        <div class="flex items-center gap-4">
          <div class="flex-1">
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Best-Effort Gap Fill</label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Finds all numeric ID gaps in the synced range and fetches every missing asset from the integration.
              Runs as a background job — monitor progress in the <strong>Jobs</strong> dashboard.
            </p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            @if (bestEffortResult()) {
              <span class="text-xs text-green-700 font-medium">{{ bestEffortResult()!.message }}</span>
            }
            <button type="button" (click)="runBestEffort()" [disabled]="bestEffortRunning()"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold transition">
              @if (bestEffortRunning()) {
                <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                Triggering…
              } @else {
                ⚡ Run Gap Fill
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Source summary cards -->
      @if (sources().length > 0) {
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          @for (s of sources(); track s.source) {
            <div class="ta-admin-surface p-4 flex items-start gap-3 cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition"
              [class]="filterSource === s.source ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/20' : ''"
              (click)="selectSource(s.source)">
              <div class="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z"/>
                </svg>
              </div>
              <div class="min-w-0">
                <div class="font-semibold text-gray-900 dark:text-gray-100 text-sm">{{ sourceLabel(s.source) }}</div>
                <div class="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mt-0.5">{{ s.count.toLocaleString() }}</div>
                <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Last synced {{ formatDate(s.last_synced_at) }}</div>
              </div>
            </div>
          }
        </div>
      }

      <!-- Filter bar -->
      <div class="flex flex-wrap gap-3 mb-4">
        <input type="search" [(ngModel)]="filterQ" (ngModelChange)="onSearch()"
          placeholder="Search name, ID, category…"
          class="ta-admin-control flex-1 min-w-48 px-3 py-1.5 text-sm"/>

        <select [(ngModel)]="filterSource" (ngModelChange)="load()" aria-label="Filter by source"
          class="ta-admin-control px-3 py-1.5 text-sm">
          <option value="">All sources</option>
          @for (s of sources(); track s.source) {
            <option [value]="s.source">{{ sourceLabel(s.source) }}</option>
          }
        </select>

        <select [(ngModel)]="filterActive" (ngModelChange)="load()" aria-label="Filter by status"
          class="ta-admin-control px-3 py-1.5 text-sm">
          <option value="">Active & inactive</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>

        <button type="button" (click)="expandAll()"
          class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs">
          Expand all
        </button>
        <button type="button" (click)="collapseAll()"
          class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs">
          Collapse all
        </button>

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
                        <!-- Expand/collapse -->
                        @if (node.has_children) {
                          <button type="button" (click)="toggleNode(node.external_id); $event.stopPropagation()"
                            class="w-5 h-5 mr-1.5 flex items-center justify-center rounded text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 shrink-0 transition">
                            {{ collapsed().has(node.external_id) ? '▸' : '▾' }}
                          </button>
                        } @else {
                          <span class="w-5 h-5 mr-1.5 shrink-0"></span>
                        }
                        <!-- Icon -->
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

      <!-- ── Detail modal ──────────────────────────────────────────────── -->
      @if (selectedAsset()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
            <div class="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
              <div class="min-w-0">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ selectedAsset()!.display_name }}</h3>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <span class="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                    {{ sourceLabel(selectedAsset()!.source) }}
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
                <button type="button" (click)="syncOneFromDetail()"
                  [disabled]="syncingOne()"
                  class="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition">
                  @if (syncingOne()) {
                    <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    Syncing…
                  } @else {
                    ↓ Re-sync this asset
                  }
                </button>
                <button type="button" (click)="selectedAsset.set(null)"
                  class="ta-btn ta-btn-secondary px-4 py-2">Close</button>
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

  // Sync-one state
  syncOneId     = '';
  syncingOne    = signal(false);
  syncOneResult = signal<any>(null);

  // Best-effort gap fill state
  bestEffortRunning = signal(false);
  bestEffortResult  = signal<any>(null);

  // Raw flat list from backend (already tree-ordered and depth-annotated)
  nodes   = signal<AssetTreeNode[]>([]);
  loading = signal(true);
  error   = signal<string | null>(null);
  sources = signal<{ source: string; count: number; last_synced_at: string }[]>([]);
  categories = signal<string[]>([]);

  // Client-side collapse state only — tree structure comes from backend
  collapsed = signal<Set<string>>(new Set());

  filterQ        = '';
  filterSource   = '';
  filterActive   = '';

  selectedAsset  = signal<ExternalAsset | null>(null);
  rawLoading     = signal(false);
  rawJson        = signal('');
  detailTab: 'overview' | 'raw' = 'overview';
  renderedGroups = signal<RenderedGroup[]>([]);

  // Visible nodes = all nodes whose entire ancestor chain is not collapsed
  visibleNodes = computed(() => {
    const col = this.collapsed();
    if (col.size === 0) return this.nodes();

    // Build set of all external_ids that are collapsed ancestors
    // A node is hidden if any of its ancestors (by parentExternalId chain) is collapsed.
    // Since the list is already depth-first ordered, we can track which parent IDs are
    // collapsed and hide any node whose parent_external_id is in the hidden set.
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
  sourceLabel(s: string): string { return SOURCE_LABEL[s] ?? s; }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    // Don't reset collapsed here — keep current state while reloading

    this.jobService.getAssetTree({
      source:   this.filterSource || undefined,
      q:        this.filterQ      || undefined,
      isActive: this.filterActive ? this.filterActive === 'true' : undefined,
    }).subscribe({
      next: (res) => {
        this.nodes.set(res.nodes);
        this.sources.set(res.sources);
        this.categories.set(res.categories);
        this.loading.set(false);

        if (this.filterQ) {
          // When searching, expand everything so matched nodes are visible
          this.collapsed.set(new Set());
        } else {
          // Default: collapse ALL nodes that have children so the user expands one by one
          const col = new Set<string>(
            res.nodes.filter(n => n.has_children).map(n => n.external_id)
          );
          this.collapsed.set(col);
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

  selectSource(source: string): void {
    this.filterSource = this.filterSource === source ? '' : source;
    this.load();
  }

  toggleNode(externalId: string): void {
    const col = new Set(this.collapsed());
    if (col.has(externalId)) col.delete(externalId);
    else col.add(externalId);
    this.collapsed.set(col);
  }

  expandAll(): void  { this.collapsed.set(new Set()); }

  collapseAll(): void {
    const col = new Set(
      this.nodes().filter(n => n.has_children).map(n => n.external_id)
    );
    this.collapsed.set(col);
  }

  openDetail(node: AssetTreeNode): void {
    this.selectedAsset.set(node);
    this.detailTab    = 'overview';
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
        // Refresh tree to show newly synced asset
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
      next: (res) => {
        this.bestEffortRunning.set(false);
        this.bestEffortResult.set(res);
      },
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
