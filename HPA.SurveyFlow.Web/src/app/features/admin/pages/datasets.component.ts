import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatasetService } from '../../../core/services/dataset.service';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';
import { FormService } from '../../../core/services/form.service';
import { Dataset, Form } from '../../../core/models';

@Component({
  selector: 'app-datasets',
  standalone: true,
  imports: [CommonModule, FormsModule, HelpTriggerComponent],
  template: `
    <div>

      <div class="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">Datasets <app-help-trigger helpKey="admin.datasets.list" label="Datasets help" /></h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Reusable filtered subsets of form submissions for reports</p>
        </div>
        <button type="button" (click)="openNew()" class="ta-btn ta-btn-primary">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          New Dataset
        </button>
      </div>

      @if (error()) {
        <div class="ta-alert-error mb-4">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="py-16 text-center text-sm text-gray-400">Loading datasets...</div>
      } @else if (datasets().length === 0) {
        <div class="ta-card flex flex-col items-center justify-center py-16 text-center">
          <div class="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
            <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
            </svg>
          </div>
          <h3 class="text-base font-semibold text-gray-800 dark:text-white mb-1">No datasets yet</h3>
          <p class="text-sm text-gray-400 mb-6 max-w-xs">Create a dataset to define a reusable filtered view of submissions.</p>
          <button type="button" (click)="openNew()" class="ta-btn ta-btn-primary">Create Dataset</button>
        </div>
      } @else {
        <div class="ta-table-shell">
          <table class="ta-table min-w-[840px]">
            <thead>
              <tr class="ta-table-head">
                <th scope="col" class="ta-table-th">Dataset</th>
                <th scope="col" class="ta-table-th">Form</th>
                <th scope="col" class="ta-table-th">Terminal</th>
                <th scope="col" class="ta-table-th">Status</th>
                <th scope="col" class="ta-table-th">Updated</th>
                <th scope="col" class="ta-table-th text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (d of datasets(); track d.id) {
                <tr class="ta-table-row align-top">
                  <td class="px-5 py-4">
                    <div class="font-semibold text-gray-900 dark:text-white">{{ d.name }}</div>
                    <div class="mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400">{{ d.description || 'No description.' }}</div>
                  </td>
                  <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{{ formName(d.form_id) }}</td>
                  <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">{{ terminalLabel(d.terminal_code) }}</td>
                  <td class="px-5 py-4">
                    <span class="ta-badge" [class]="d.is_active ? 'ta-badge-success' : 'ta-badge-neutral'">
                      {{ d.is_active ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td class="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">{{ d.updated_at | date:'mediumDate' }}</td>
                  <td class="px-5 py-4">
                    <div class="flex justify-end gap-2">
                      <button type="button" (click)="openEdit(d)" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs">Edit</button>
                      <button type="button" (click)="deletingDataset.set(d)" class="ta-btn ta-btn-ghost px-3 py-1.5 text-xs text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
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

    <!-- Create / Edit modal -->
    @if (editing()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div class="ta-card w-full max-w-lg shadow-xl flex flex-col gap-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ editingId() ? 'Edit Dataset' : 'New Dataset' }}
          </h3>

          @if (saveError()) {
            <div class="ta-alert-error">{{ saveError() }}</div>
          }

          <div class="flex flex-col gap-3">
            <label class="ta-label">
              Name <span class="text-red-500">*</span>
              <input type="text" [(ngModel)]="form.name" class="ta-field mt-1" placeholder="Dataset name" maxlength="120"/>
            </label>
            <label class="ta-label">
              Form <span class="text-red-500">*</span>
              <select [(ngModel)]="form.form_id" class="ta-field mt-1">
                <option [value]="0">Select a form…</option>
                @for (f of forms(); track f.id) {
                  <option [value]="f.id">{{ f.name }}</option>
                }
              </select>
            </label>
            <label class="ta-label">
              Description
              <textarea [(ngModel)]="form.description" rows="2" class="ta-field mt-1" placeholder="Optional description"></textarea>
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" [(ngModel)]="form.is_active" class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"/>
              Active
            </label>
          </div>

          <div class="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button" (click)="closeModal()" class="ta-btn ta-btn-secondary text-sm">Cancel</button>
            <button type="button" (click)="save()" [disabled]="saving() || !form.name.trim() || !form.form_id"
              class="ta-btn ta-btn-primary text-sm disabled:opacity-50">
              {{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Delete confirmation -->
    @if (deletingDataset()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div class="ta-card w-full max-w-sm shadow-xl">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-2">Delete Dataset</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Delete <strong class="text-gray-900 dark:text-white">{{ deletingDataset()!.name }}</strong>? This cannot be undone.
          </p>
          <div class="flex gap-3 justify-end">
            <button type="button" (click)="deletingDataset.set(null)" class="ta-btn ta-btn-secondary text-sm">Cancel</button>
            <button type="button" (click)="confirmDelete()" [disabled]="deleting()"
              class="ta-btn text-sm bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/40 disabled:opacity-50">
              {{ deleting() ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class DatasetsComponent implements OnInit {
  private datasetService = inject(DatasetService);
  private formService = inject(FormService);

  datasets = signal<Dataset[]>([]);
  total = signal(0);
  offset = signal(0);
  forms = signal<Form[]>([]);
  loading = signal(true);
  error = signal('');
  editing = signal(false);
  editingId = signal<number | null>(null);
  saving = signal(false);
  saveError = signal('');
  deletingDataset = signal<Dataset | null>(null);
  deleting = signal(false);

  form = { name: '', description: '', form_id: 0, is_active: true };
  pageSize = 25;
  readonly Math = Math;
  currentPage = computed(() => Math.floor(this.offset() / this.pageSize) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  ngOnInit(): void {
    this.formService.list().subscribe({ next: f => this.forms.set(f), error: () => {} });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.datasetService.listPaged({ limit: this.pageSize, offset: this.offset() }).subscribe({
      next: result => { this.datasets.set(result.items); this.total.set(result.total ?? 0); this.loading.set(false); },
      error: () => { this.error.set('Failed to load datasets.'); this.loading.set(false); },
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

  formName(formId: number): string {
    return this.forms().find(f => f.id === formId)?.name ?? 'Unknown form';
  }

  terminalLabel(code?: string | null): string {
    return code?.trim() || 'All';
  }

  openNew(): void {
    this.form = { name: '', description: '', form_id: 0, is_active: true };
    this.editingId.set(null);
    this.saveError.set('');
    this.editing.set(true);
  }

  openEdit(d: Dataset): void {
    this.form = {
      name: d.name,
      description: d.description ?? '',
      form_id: d.form_id,
      is_active: d.is_active,
    };
    this.editingId.set(d.id);
    this.saveError.set('');
    this.editing.set(true);
  }

  closeModal(): void { this.editing.set(false); }

  save(): void {
    if (this.saving() || !this.form.name.trim() || !this.form.form_id) return;
    this.saving.set(true);
    this.saveError.set('');
    const req = {
      name: this.form.name.trim(),
      description: this.form.description.trim() || undefined,
      form_id: this.form.form_id,
      is_active: this.form.is_active,
    };
    const id = this.editingId();
    const obs = id ? this.datasetService.update(id, req) : this.datasetService.create(req);
    obs.subscribe({
      next: d => {
        if (id) {
          this.datasets.update(list => list.map(x => x.id === id ? d : x));
        } else {
          this.offset.set(0);
          this.load();
        }
        this.saving.set(false);
        this.editing.set(false);
      },
      error: () => { this.saveError.set('Failed to save dataset.'); this.saving.set(false); },
    });
  }

  confirmDelete(): void {
    const d = this.deletingDataset();
    if (!d) return;
    this.deleting.set(true);
    this.datasetService.delete(d.id).subscribe({
      next: () => {
        if (this.datasets().length === 1 && this.offset() > 0) {
          this.offset.update(v => Math.max(0, v - this.pageSize));
        }
        this.load();
        this.deletingDataset.set(null);
        this.deleting.set(false);
      },
      error: () => { this.deleting.set(false); },
    });
  }
}
