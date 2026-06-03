import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';
import { AuditLog } from '../../../core/models';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, HelpTriggerComponent],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Audit Log <app-help-trigger helpKey="admin.audit-log.list" label="Audit log help" /></h1>
          <p class="text-sm text-gray-500 mt-1">Track all system activity and changes</p>
        </div>
        <a [href]="exportUrl()" class="ta-btn ta-btn-secondary px-3 py-1.5">Export CSV</a>
      </div>

      <!-- Filters -->
      <div class="ta-admin-surface p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Entity Type</label>
          <select class="ta-admin-control w-full px-3 py-1.5 text-sm" [(ngModel)]="filterEntityType" (change)="load()">
            <option value="">All types</option>
            @for (t of entityTypes(); track t) {
              <option [value]="t">{{ t }}</option>
            }
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Search</label>
          <input class="ta-admin-control w-full px-3 py-1.5 text-sm" placeholder="Email, entity, ID…"
                 [(ngModel)]="filterSearch" (keyup.enter)="load()" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">From</label>
          <input type="date" class="ta-admin-control w-full px-3 py-1.5 text-sm" [(ngModel)]="filterDateFrom" (change)="load()" />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">To</label>
          <input type="date" class="ta-admin-control w-full px-3 py-1.5 text-sm" [(ngModel)]="filterDateTo" (change)="load()" />
        </div>
      </div>

      <!-- Table -->
      <div class="ta-table-shell">
        @if (error()) {
          <div class="p-8 text-center text-red-600 dark:text-red-400">{{ error() }}</div>
        } @else if (loading()) {
          <div class="p-8 text-center text-gray-500">Loading…</div>
        } @else if (items().length === 0) {
          <div class="p-8 text-center text-gray-500">No audit records found.</div>
        } @else {
          <table class="ta-table min-w-[640px]">
            <thead class="ta-table-head border-b border-gray-200 dark:border-gray-600">
              <tr>
                <th scope="col" class="ta-table-th px-4">Time</th>
                <th scope="col" class="ta-table-th px-4">Actor</th>
                <th scope="col" class="ta-table-th px-4">Action</th>
                <th scope="col" class="ta-table-th px-4">Entity</th>
                <th scope="col" class="ta-table-th px-4">Name / ID</th>
                <th scope="col" class="ta-table-th px-4">IP</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
              @for (item of items(); track item.id) {
                <tr class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/60" (click)="selectItem(item)">
                  <td class="px-4 py-3 text-gray-500 whitespace-nowrap">{{ item.occurred_at | date:'dd/MM/yy HH:mm' }}</td>
                  <td class="px-4 py-3 text-gray-700 dark:text-gray-200">{{ item.actor_email }}</td>
                  <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                          [class]="actionBadgeClass(item.action)">
                      {{ item.action }}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ item.entity_type }}</td>
                  <td class="px-4 py-3 text-gray-700 dark:text-gray-200">{{ item.entity_name || item.entity_id }}</td>
                  <td class="px-4 py-3 text-gray-500 text-xs">{{ item.ip_address || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>

          <!-- Pagination -->
          <div class="flex items-center justify-between px-4 py-3 border-t border-gray-200 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <span>Showing {{ offset() + 1 }}–{{ offset() + items().length }} of {{ total() }}</span>
            <div class="flex gap-2">
              <button class="ta-btn ta-btn-ghost px-2 py-1 text-xs" [disabled]="offset() === 0" (click)="prevPage()">← Prev</button>
              <button class="ta-btn ta-btn-ghost px-2 py-1 text-xs" [disabled]="offset() + items().length >= total()" (click)="nextPage()">Next →</button>
            </div>
          </div>
        }
      </div>
    </div>

    <!-- Detail modal -->
    @if (selectedItem()) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="selectedItem.set(null)">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-auto p-6 text-gray-700 dark:bg-gray-800 dark:text-gray-200" (click)="$event.stopPropagation()">
          <div class="flex justify-between items-start mb-4">
            <h2 class="text-lg font-semibold">Audit Detail</h2>
            <button class="text-gray-500 hover:text-gray-600" (click)="selectedItem.set(null)">✕</button>
          </div>
          <dl class="grid grid-cols-2 gap-3 text-sm">
            <dt class="text-gray-500">Time</dt><dd>{{ selectedItem()!.occurred_at | date:'medium' }}</dd>
            <dt class="text-gray-500">Actor</dt><dd>{{ selectedItem()!.actor_email }}</dd>
            <dt class="text-gray-500">Action</dt><dd>{{ selectedItem()!.action }}</dd>
            <dt class="text-gray-500">Entity</dt><dd>{{ selectedItem()!.entity_type }}</dd>
            <dt class="text-gray-500">Entity ID</dt><dd>{{ selectedItem()!.entity_id }}</dd>
            <dt class="text-gray-500">Entity Name</dt><dd>{{ selectedItem()!.entity_name || '—' }}</dd>
            <dt class="text-gray-500">IP Address</dt><dd>{{ selectedItem()!.ip_address || '—' }}</dd>
          </dl>
          @if (selectedItem()!.changes_json) {
            <div class="mt-4">
              <p class="text-xs font-medium text-gray-500 mb-1">Changes</p>
              <pre class="bg-gray-50 rounded p-3 text-xs overflow-auto max-h-64 dark:bg-gray-900">{{ formatJson(selectedItem()!.changes_json!) }}</pre>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class AuditLogComponent implements OnInit {
  private svc = inject(AuditLogService);

  loading = signal(false);
  error = signal('');
  items = signal<AuditLog[]>([]);
  total = signal(0);
  entityTypes = signal<string[]>([]);
  selectedItem = signal<AuditLog | null>(null);

  filterEntityType = '';
  filterSearch = '';
  filterDateFrom = '';
  filterDateTo = '';

  private pageSize = 50;
  offset = signal(0);

  exportUrl = computed(() =>
    this.svc.exportCsvUrl({
      entityType: this.filterEntityType || undefined,
      dateFrom: this.filterDateFrom || undefined,
      dateTo: this.filterDateTo || undefined,
    })
  );

  ngOnInit() {
    this.svc.entityTypes().subscribe(t => this.entityTypes.set(t));
    this.load();
  }

  load() {
    this.offset.set(0);
    this.fetch();
  }

  prevPage() { this.offset.update(o => Math.max(0, o - this.pageSize)); this.fetch(); }
  nextPage() { this.offset.update(o => o + this.pageSize); this.fetch(); }

  private fetch() {
    this.loading.set(true);
    this.error.set('');
    this.svc.list({
      entityType: this.filterEntityType || undefined,
      search: this.filterSearch || undefined,
      dateFrom: this.filterDateFrom || undefined,
      dateTo: this.filterDateTo || undefined,
      limit: this.pageSize,
      offset: this.offset(),
    }).subscribe({
      next: r => { this.items.set(r.items); this.total.set(r.total); this.loading.set(false); },
      error: () => {
        this.items.set([]);
        this.total.set(0);
        this.error.set('Failed to load audit records.');
        this.loading.set(false);
      },
    });
  }

  selectItem(item: AuditLog) { this.selectedItem.set(item); }

  actionBadgeClass(action: string): string {
    const map: Record<string, string> = {
      created: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      updated: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      deleted: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      restored: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      login: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
      logout: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    };
    return map[action] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  }

  formatJson(raw: string): string {
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  }
}
