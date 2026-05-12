import { Component, OnInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FormService } from '../../../core/services/form.service';
import { ToastrService } from 'ngx-toastr';
import { FormEditorComponent } from '../../../shared/components/formio/form-editor.component';
import { Form } from '../../../core/models';

@Component({
  selector: 'app-admin-form-edit',
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
        <h1 class="text-2xl font-bold text-gray-900">
          @if (form()) {
            Edit Form: {{ form()!.name }}
          } @else {
            Edit Form
          }
        </h1>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center items-center py-16">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      <!-- Load error -->
      @if (loadError()) {
        <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {{ loadError() }}
        </div>
      }

      <!-- Content -->
      @if (!loading() && form()) {
        <!-- Save error -->
        @if (saveError()) {
          <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {{ saveError() }}
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
          <app-form-editor #editorRef [formSchema]="currentSchema" />
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
      }
    </div>
  `,
})
export class FormEditComponent implements OnInit {
  @ViewChild('editorRef') editorRef!: FormEditorComponent;

  router = inject(Router);
  private route = inject(ActivatedRoute);
  private formService = inject(FormService);
  private toastr = inject(ToastrService);

  form = signal<Form | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);

  name = '';
  allowAnonymous = false;
  visibility = 'public';
  currentSchema: any = {};

  private formId!: number;

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) {
      this.loadError.set('No form ID provided.');
      this.loading.set(false);
      return;
    }
    this.formId = Number(idStr);
    this.formService.get(this.formId).subscribe({
      next: (f) => {
        this.form.set(f);
        this.name = f.name;
        this.allowAnonymous = !!f.allow_anonymous_submit;
        this.visibility = f.visibility;
        this.currentSchema = f.json ?? {};
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.error?.error || 'Failed to load form.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (!this.name.trim()) {
      this.saveError.set('Form name is required.');
      return;
    }
    this.saveError.set(null);
    const schema = this.editorRef ? this.editorRef.getSchema() : this.currentSchema;
    this.saving.set(true);
    this.formService.update(this.formId, {
      name: this.name.trim(),
      json: schema,
      allow_anonymous_submit: this.allowAnonymous ? 1 : 0,
      visibility: this.visibility,
    }).subscribe({
      next: () => {
        this.toastr.success('Form updated successfully.');
        this.router.navigate(['/admin/forms']);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.error || 'Failed to update form.');
        this.toastr.error(this.saveError()!);
      },
    });
  }
}
