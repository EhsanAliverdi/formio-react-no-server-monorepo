import { Component, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormService } from '../../../core/services/form.service';
import { ToastrService } from 'ngx-toastr';
import { FormEditorComponent } from '../../../shared/components/formio/form-editor.component';

@Component({
  selector: 'app-admin-form-new',
  standalone: true,
  imports: [CommonModule, FormsModule, FormEditorComponent],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <button
          type="button"
          (click)="router.navigate(['/admin/forms'])"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 class="text-2xl font-bold text-gray-900">New Form</h1>
      </div>

      <!-- Error -->
      @if (error()) {
        <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      <!-- Form fields -->
      <div class="mb-6 space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Form Name <span class="text-red-500">*</span></label>
          <input
            type="text"
            [(ngModel)]="name"
            placeholder="Enter form name"
            class="w-full max-w-lg rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div class="flex items-center gap-3">
          <input
            type="checkbox"
            id="allowAnon"
            [(ngModel)]="allowAnonymous"
            class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label for="allowAnon" class="text-sm font-medium text-gray-700">Allow anonymous submissions</label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
          <select
            [(ngModel)]="visibility"
            class="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="public">Public</option>
            <option value="restricted">Restricted</option>
          </select>
        </div>
      </div>

      <!-- Schema builder -->
      <div class="mb-6 bg-white rounded-xl border border-gray-200 p-6">
        <h2 class="text-base font-semibold text-gray-800 mb-4">Form Builder</h2>
        <app-form-editor #editorRef />
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3">
        <button
          type="button"
          (click)="save()"
          [disabled]="saving()"
          class="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
        >
          @if (saving()) {
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            Saving…
          } @else {
            Save Form
          }
        </button>
        <button
          type="button"
          (click)="router.navigate(['/admin/forms'])"
          class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    </div>
  `,
})
export class FormNewComponent {
  @ViewChild('editorRef') editorRef!: FormEditorComponent;

  router = inject(Router);
  private formService = inject(FormService);
  private toastr = inject(ToastrService);

  name = '';
  allowAnonymous = false;
  visibility = 'public';

  saving = signal(false);
  error = signal<string | null>(null);

  save(): void {
    if (!this.name.trim()) {
      this.error.set('Form name is required.');
      return;
    }
    this.error.set(null);
    const schema = this.editorRef ? this.editorRef.getSchema() : {};
    this.saving.set(true);
    this.formService.create({
      name: this.name.trim(),
      json: schema,
      allow_anonymous_submit: this.allowAnonymous ? 1 : 0,
      visibility: this.visibility,
    }).subscribe({
      next: () => {
        this.toastr.success('Form created successfully.');
        this.router.navigate(['/admin/forms']);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.error || 'Failed to create form.');
        this.toastr.error(this.error()!);
      },
    });
  }
}
