import { Component, OnInit, signal, computed, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormService } from '../../../core/services/form.service';
import { IconService } from '../../../core/services/icon.service';
import { ToastrService } from 'ngx-toastr';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';
import { Form } from '../../../core/models';

@Component({
  selector: 'app-admin-forms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HelpTriggerComponent],
  template: `
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Forms</h1>
          <p class="text-sm text-gray-500 mt-0.5">Create and manage survey forms.</p>
        </div>
        <div class="flex items-center gap-2">
          <input #importFileInput type="file" accept="application/json,.json" class="hidden" (change)="importForm($event)" />
          <div class="ta-btn-group">
            <button
              type="button"
              (click)="importFileInput.click()"
              class="ta-btn-group-action"
            >
              Import JSON
            </button>
            <app-help-trigger helpKey="admin.forms.import-json" label="Help for importing form JSON" [grouped]="true" />
          </div>
          <a
            routerLink="/admin/forms/new"
            class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Form
          </a>
        </div>
      </div>

      <!-- Error -->
      <div *ngIf="error()" class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {{ error() }}
      </div>

      <!-- Search -->
      <div class="mb-4">
        <input
          type="text"
          [(ngModel)]="searchQuery"
          placeholder="Search forms..."
          class="w-full max-w-sm rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <!-- Loading -->
      <div *ngIf="loading()" class="flex justify-center items-center py-16">
        <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>

      <!-- Table -->
      <div *ngIf="!loading()" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table class="min-w-[640px] w-full divide-y divide-gray-100">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span class="flex items-center gap-1">
                  Visibility
                  <app-help-trigger helpKey="admin.forms.visibility" label="Help for form visibility" />
                </span>
              </th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <span class="flex items-center gap-1">
                  Anonymous
                  <app-help-trigger helpKey="admin.forms.anonymous" label="Help for anonymous submissions" />
                </span>
              </th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr *ngIf="filteredForms().length === 0">
              <td colspan="4" class="px-6 py-8 text-center text-sm text-gray-500">
                {{ searchQuery ? 'No forms match your search.' : 'No forms yet. Create your first form.' }}
              </td>
            </tr>
            <ng-container *ngFor="let form of filteredForms()">
              <!-- Main form row -->
              <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4 text-sm font-medium text-gray-900">
                  <div class="flex items-center gap-2">
                    @if (formThumbnailUrl(form); as thumb) {
                      <img [src]="thumb" [alt]="form.name" class="w-8 h-8 rounded object-contain flex-shrink-0 border border-gray-200 bg-gray-50 p-0.5"/>
                    }
                    {{ form.name }}
                    @if (childCount(form.id) > 0) {
                      <button
                        type="button"
                        (click)="toggleExpand(form.id)"
                        class="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium ml-1"
                      >
                        <svg class="w-3 h-3 transition-transform" [class.rotate-90]="isExpanded(form.id)"
                          fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                        </svg>
                        Sub-forms ({{ childCount(form.id) }})
                      </button>
                    }
                  </div>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                    [class.bg-green-100]="form.visibility === 'public'"
                    [class.text-green-800]="form.visibility === 'public'"
                    [class.bg-yellow-100]="form.visibility === 'restricted'"
                    [class.text-yellow-800]="form.visibility === 'restricted'"
                    [class.bg-gray-100]="form.visibility !== 'public' && form.visibility !== 'restricted'"
                    [class.text-gray-800]="form.visibility !== 'public' && form.visibility !== 'restricted'"
                  >
                    {{ form.visibility }}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                  {{ form.allow_anonymous_submit ? 'Yes' : 'No' }}
                </td>
                <td class="px-6 py-4 text-right flex items-center justify-end gap-2">
                  <a
                    [routerLink]="['/admin/forms', form.id, 'view']"
                    class="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  >
                    View
                  </a>
                  <a
                    [routerLink]="['/admin/forms', form.id, 'edit']"
                    class="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                  >
                    Edit
                  </a>
                  <button
                    type="button"
                    (click)="exportForm(form)"
                    class="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    (click)="deleteForm(form)"
                    class="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
                  >
                    Delete
                  </button>
                </td>
              </tr>
              <!-- Expanded sub-forms inline rows -->
              @if (isExpanded(form.id)) {
                @for (child of childForms(form.id); track child.id) {
                  <tr class="bg-purple-50 border-l-4 border-purple-300">
                    <td class="pl-10 pr-6 py-3 text-sm text-gray-700">
                      <div class="flex items-center gap-2">
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">sub</span>
                        @if (formThumbnailUrl(child); as thumb) {
                          <img [src]="thumb" [alt]="child.name" class="w-7 h-7 rounded object-contain flex-shrink-0 border border-gray-200 bg-gray-50 p-0.5"/>
                        }
                        {{ child.name }}
                      </div>
                    </td>
                    <td class="px-6 py-3">
                      <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {{ child.visibility }}
                      </span>
                    </td>
                    <td class="px-6 py-3 text-sm text-gray-500">{{ child.allow_anonymous_submit ? 'Yes' : 'No' }}</td>
                    <td class="px-6 py-3 text-right flex items-center justify-end gap-2">
                      <a
                        [routerLink]="['/admin/forms', child.id, 'edit']"
                        class="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
                      >
                        Edit
                      </a>
                      <button
                        type="button"
                        (click)="deleteSubForm(child)"
                        class="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                }
              }
            </ng-container>
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class AdminFormsComponent implements OnInit {
  @ViewChild('importFileInput') importFileInput!: ElementRef<HTMLInputElement>;

  private formService = inject(FormService);
  private iconService = inject(IconService);
  private toastr = inject(ToastrService);
  private confirm = inject(ConfirmDialogService);
  private router = inject(Router);

  forms = signal<Form[]>([]);
  loading = signal(true);
  error = signal('');
  searchQuery = '';

  private expandedIds = signal<Set<number>>(new Set());

  filteredForms = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    // Only top-level forms in the main list; sub-forms appear under their expanded parent
    const topLevel = this.forms().filter(f => f.parent_form_id == null);
    if (!q) return topLevel;
    return topLevel.filter(f => f.name.toLowerCase().includes(q));
  });

  childCount(parentId: number): number {
    return this.forms().filter(f => f.parent_form_id === parentId).length;
  }

  childForms(parentId: number): Form[] {
    return this.forms().filter(f => f.parent_form_id === parentId);
  }

  isExpanded(id: number): boolean {
    return this.expandedIds().has(id);
  }

  toggleExpand(id: number): void {
    const next = new Set(this.expandedIds());
    if (next.has(id)) next.delete(id); else next.add(id);
    this.expandedIds.set(next);
  }

  formThumbnailUrl(form: Form): string | null {
    const s = this.parseFormJson(form);
    if (!s?.appSettings) return null;
    if (s.appSettings.categoryImage || s.appSettings.preStartImage) return s.appSettings.categoryImage || s.appSettings.preStartImage;
    const key: string | null = s.appSettings.categoryIcon || s.appSettings.preStartIcon || s.appSettings.formsListIconKey || null;
    if (!key || !key.includes(':')) return null;
    const [pack, name] = key.split(':', 2);
    return this.iconService.getSvgUrl(pack, name);
  }

  private parseFormJson(form: Form): any {
    if (!form.json) return null;
    if (typeof form.json === 'string') {
      try { return JSON.parse(form.json); } catch { return null; }
    }
    return form.json;
  }

  ngOnInit(): void {
    this.loadForms();
  }

  loadForms(): void {
    this.loading.set(true);
    this.formService.list().subscribe({
      next: (forms) => {
        this.forms.set(forms);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to load forms.');
      },
    });
  }

  async deleteForm(form: Form): Promise<void> {
    const ok = await this.confirm.open({
      title: 'Delete Form',
      message: `Delete form "${form.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    this.formService.delete(form.id).subscribe({
      next: () => {
        this.toastr.success(`Form "${form.name}" deleted.`, 'Deleted');
        this.forms.update(list => list.filter(f => f.id !== form.id));
      },
      error: (err) => {
        this.toastr.error(err?.error?.error || 'Failed to delete form.', 'Error');
      },
    });
  }

  async deleteSubForm(form: Form): Promise<void> {
    const ok = await this.confirm.open({
      title: 'Delete Sub-Form',
      message: `Delete sub-form "${form.name}"? It will no longer be linked to its parent. This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    this.formService.delete(form.id).subscribe({
      next: () => {
        this.toastr.success(`Sub-form "${form.name}" deleted.`, 'Deleted');
        this.forms.update(list => list.filter(f => f.id !== form.id));
      },
      error: (err) => {
        this.toastr.error(err?.error?.error || 'Failed to delete sub-form.', 'Error');
      },
    });
  }

  exportForm(form: Form): void {
    const payload = {
      exported_at: new Date().toISOString(),
      type: 'surveyflow.form',
      version: 1,
      name: form.name,
      json: form.json,
      allow_anonymous_submit: form.allow_anonymous_submit ? 1 : 0,
      visibility: form.visibility,
      parent_form_id: form.parent_form_id ?? null,
      allowed_roles: form.allowed_roles ?? [],
      allowed_user_ids: form.allowed_user_ids ?? [],
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.toFileName(form.name)}.surveyflow-form.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importForm(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? ''));
        const request = this.toCreateRequest(parsed, file.name);
        this.formService.create(request).subscribe({
          next: (res) => {
            this.toastr.success(`Form "${request.name}" imported.`, 'Imported');
            this.loadForms();
            this.router.navigate(['/admin/forms', res.id, 'edit']);
          },
          error: (err) => {
            this.toastr.error(err?.error?.error || 'Failed to import form.', 'Error');
          },
        });
      } catch {
        this.toastr.error('The selected file is not valid JSON.', 'Import failed');
      } finally {
        input.value = '';
      }
    };
    reader.onerror = () => {
      input.value = '';
      this.toastr.error('Could not read the selected file.', 'Import failed');
    };
    reader.readAsText(file);
  }

  private toCreateRequest(parsed: any, fileName: string): any {
    const schema = parsed?.json ?? parsed?.schema ?? parsed;
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      throw new Error('Invalid form JSON.');
    }

    return {
      name: this.importName(parsed, schema, fileName),
      json: schema,
      allow_anonymous_submit: parsed?.allow_anonymous_submit ?? 1,
      visibility: parsed?.visibility ?? 'public',
      parent_form_id: parsed?.parent_form_id ?? null,
      allowed_roles: Array.isArray(parsed?.allowed_roles) ? parsed.allowed_roles : [],
      allowed_user_ids: Array.isArray(parsed?.allowed_user_ids) ? parsed.allowed_user_ids : [],
    };
  }

  private importName(parsed: any, schema: any, fileName: string): string {
    const raw = parsed?.name || schema?.title || fileName.replace(/\.json$/i, '');
    const name = String(raw).trim() || 'Imported Form';
    return this.forms().some(f => f.name === name) ? `${name} (Imported)` : name;
  }

  private toFileName(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'form';
  }
}
