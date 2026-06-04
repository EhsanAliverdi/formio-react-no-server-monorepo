import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PageService } from '../../../core/services/page.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { Page } from '../../../core/models';

@Component({
  selector: 'app-page-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div>
      <div class="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Pages</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Build public and restricted content pages served at /page/slug.</p>
        </div>
        <a routerLink="/admin/pages/new" class="ta-btn ta-btn-primary">New Page</a>
      </div>

      @if (error()) { <div class="ta-alert-error mb-4">{{ error() }}</div> }
      @if (loading()) {
        <div class="py-16 text-center text-sm text-gray-400">Loading pages...</div>
      } @else if (pages().length === 0) {
        <div class="ta-card py-16 text-center">
          <p class="text-sm text-gray-500 dark:text-gray-400">No pages yet.</p>
        </div>
      } @else {
        <div class="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div class="overflow-x-auto">
            <table class="min-w-[900px] w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th class="px-4 py-3">Page</th>
                  <th class="px-4 py-3">URL</th>
                  <th class="px-4 py-3">Terminal</th>
                  <th class="px-4 py-3">Access</th>
                  <th class="px-4 py-3">Layout</th>
                  <th class="px-4 py-3">Status</th>
                  <th class="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
                @for (page of pages(); track page.id) {
                  <tr class="align-top hover:bg-gray-50 dark:hover:bg-white/5">
                    <td class="px-4 py-3">
                      <div class="font-semibold text-gray-900 dark:text-white">{{ page.title }}</div>
                      <div class="mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400">{{ page.description || 'No description.' }}</div>
                    </td>
                    <td class="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">/page/{{ page.slug }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ terminalLabel(page.terminal_code) }}</td>
                    <td class="px-4 py-3">
                      <span class="ta-badge" [class]="page.visibility === 'public' ? 'ta-badge-success' : 'ta-badge-warning'">
                        {{ page.visibility === 'public' ? 'Public' : 'Restricted' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ page.use_layout ? 'Public layout' : 'Empty canvas' }}</td>
                    <td class="px-4 py-3">
                      <span class="ta-badge" [class]="page.is_active ? 'ta-badge-success' : 'ta-badge-danger'">{{ page.is_active ? 'Active' : 'Inactive' }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <div class="flex justify-end gap-2">
                        <a [routerLink]="['/admin/pages', page.id, 'designer']" class="ta-btn ta-btn-primary px-3 py-1.5 text-xs">Design</a>
                        <a [routerLink]="['/page', page.slug]" target="_blank" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs">View</a>
                        <button type="button" (click)="duplicate(page)" [disabled]="duplicatingId() === page.id" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs disabled:opacity-50">
                          {{ duplicatingId() === page.id ? 'Copying...' : 'Duplicate' }}
                        </button>
                        <button type="button" (click)="remove(page)" class="ta-btn ta-btn-ghost px-3 py-1.5 text-xs text-red-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Showing {{ total() === 0 ? 0 : offset() + 1 }}-{{ Math.min(offset() + pageSize, total()) }} of {{ total() }}
            </div>
            <div class="flex items-center gap-2">
              <select [(ngModel)]="pageSize" (ngModelChange)="changePageSize()" class="ta-admin-control px-2 py-1 text-sm">
                <option [value]="10">10</option>
                <option [value]="25">25</option>
                <option [value]="50">50</option>
                <option [value]="100">100</option>
              </select>
              <button type="button" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs" [disabled]="offset() === 0" (click)="previousPage()">Previous</button>
              <span class="text-xs">Page {{ currentPage() }} of {{ totalPages() }}</span>
              <button type="button" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs" [disabled]="offset() + pageSize >= total()" (click)="nextPage()">Next</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class PageListComponent implements OnInit {
  private pageService = inject(PageService);
  private confirm = inject(ConfirmDialogService);
  pages = signal<Page[]>([]);
  total = signal(0);
  offset = signal(0);
  loading = signal(true);
  error = signal('');
  duplicatingId = signal<number | null>(null);
  pageSize = 25;
  readonly Math = Math;
  currentPage = computed(() => Math.floor(this.offset() / this.pageSize) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.pageService.listPaged({ limit: this.pageSize, offset: this.offset() }).subscribe({
      next: result => {
        this.pages.set(result.items);
        this.total.set(result.total ?? 0);
        this.loading.set(false);
      },
      error: () => { this.error.set('Failed to load pages.'); this.loading.set(false); },
    });
  }

  changePageSize(): void {
    this.pageSize = Number(this.pageSize);
    this.offset.set(0);
    this.load();
  }

  nextPage(): void {
    if (this.offset() + this.pageSize >= this.total()) return;
    this.offset.update(v => v + this.pageSize);
    this.load();
  }

  previousPage(): void {
    this.offset.update(v => Math.max(0, v - this.pageSize));
    this.load();
  }

  terminalLabel(code?: string | null): string {
    return code?.trim() || 'All';
  }

  async remove(page: Page): Promise<void> {
    if (!await this.confirm.open({ title: 'Delete Page', message: `Delete "${page.title}"?`, confirmLabel: 'Delete', variant: 'danger' })) return;
    this.pageService.delete(page.id).subscribe({
      next: () => {
        if (this.pages().length === 1 && this.offset() > 0) {
          this.offset.update(v => Math.max(0, v - this.pageSize));
        }
        this.load();
      },
      error: () => this.error.set('Failed to delete page.'),
    });
  }

  duplicate(page: Page): void {
    if (this.duplicatingId() !== null) return;
    this.error.set('');
    this.duplicatingId.set(page.id);
    this.pageService.duplicate(page.id).subscribe({
      next: () => {
        this.duplicatingId.set(null);
        this.load();
      },
      error: () => {
        this.duplicatingId.set(null);
        this.error.set('Failed to duplicate page.');
      },
    });
  }
}
