import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PageService } from '../../../core/services/page.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { Page } from '../../../core/models';

@Component({
  selector: 'app-page-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
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
            <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
              <thead class="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th class="px-4 py-3">Page</th>
                  <th class="px-4 py-3">URL</th>
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
                        <button type="button" (click)="remove(page)" class="ta-btn ta-btn-ghost px-3 py-1.5 text-xs text-red-600">Delete</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
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
  loading = signal(true);
  error = signal('');

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.pageService.list().subscribe({
      next: pages => { this.pages.set(pages); this.loading.set(false); },
      error: () => { this.error.set('Failed to load pages.'); this.loading.set(false); },
    });
  }

  async remove(page: Page): Promise<void> {
    if (!await this.confirm.open({ title: 'Delete Page', message: `Delete "${page.title}"?`, confirmLabel: 'Delete', variant: 'danger' })) return;
    this.pageService.delete(page.id).subscribe({
      next: () => this.pages.update(items => items.filter(item => item.id !== page.id)),
      error: () => this.error.set('Failed to delete page.'),
    });
  }
}
