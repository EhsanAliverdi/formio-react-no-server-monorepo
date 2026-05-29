import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatasetService } from '../../../core/services/dataset.service';
import { FormService } from '../../../core/services/form.service';
import { Dataset, Form } from '../../../core/models';

@Component({
  selector: 'app-datasets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6 max-w-5xl mx-auto">

      <div class="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Datasets</h1>
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
        <div class="grid gap-4 sm:grid-cols-2">
          @for (sk of [1,2,3,4]; track sk) {
            <div class="ta-card animate-pulse">
              <div class="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div class="h-4 w-24 bg-gray-100 dark:bg-gray-700/60 rounded"></div>
            </div>
          }
        </div>
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
        <div class="grid gap-4 sm:grid-cols-2">
          @for (d of datasets(); track d.id) {
            <div class="ta-card flex flex-col gap-3 hover:border-brand-300 dark:hover:border-brand-600 hover:shadow-md transition-all">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <h3 class="text-base font-semibold text-gray-900 dark:text-white truncate">{{ d.name }}</h3>
                  <p class="text-xs text-gray-400 mt-0.5">{{ formName(d.form_id) }}</p>
                </div>
                <span [class]="d.is_active
                  ? 'inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium'
                  : 'inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 text-xs font-medium'">
                  {{ d.is_active ? 'Active' : 'Inactive' }}
                </span>
              </div>
              @if (d.description) {
                <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{{ d.description }}</p>
              }
              <div class="text-xs text-gray-400">Updated {{ d.updated_at | date:'mediumDate' }}</div>
              <div class="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <button type="button" (click)="openEdit(d)" class="ta-btn ta-btn-secondary text-xs h-8 px-3 flex-1">Edit</button>
                <button type="button" (click)="deletingDataset.set(d)"
                  class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete dataset">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>
          }
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

  ngOnInit(): void {
    this.formService.list().subscribe({ next: f => this.forms.set(f), error: () => {} });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.datasetService.list().subscribe({
      next: d => { this.datasets.set(d); this.loading.set(false); },
      error: () => { this.error.set('Failed to load datasets.'); this.loading.set(false); },
    });
  }

  formName(formId: number): string {
    return this.forms().find(f => f.id === formId)?.name ?? 'Unknown form';
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
          this.datasets.update(list => [...list, d]);
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
        this.datasets.update(list => list.filter(x => x.id !== d.id));
        this.deletingDataset.set(null);
        this.deleting.set(false);
      },
      error: () => { this.deleting.set(false); },
    });
  }
}
