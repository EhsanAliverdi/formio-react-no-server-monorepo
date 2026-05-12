import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormService } from '../../../core/services/form.service';
import { FormRendererComponent } from '../../../shared/components/formio/form-renderer.component';
import { Form } from '../../../core/models';

@Component({
  selector: 'app-admin-form-view',
  standalone: true,
  imports: [CommonModule, FormRendererComponent],
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
            {{ form()!.name }}
          } @else {
            View Form
          }
        </h1>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center items-center py-16">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      <!-- Form renderer -->
      @if (!loading() && form()) {
        <div class="bg-white rounded-xl border border-gray-200 p-6">
          <div class="formio-scope">
            <app-form-renderer [form]="form()!.json" [readOnly]="true" />
          </div>
        </div>
      }
    </div>
  `,
})
export class FormViewComponent implements OnInit {
  router = inject(Router);
  private route = inject(ActivatedRoute);
  private formService = inject(FormService);

  form = signal<Form | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) {
      this.error.set('No form ID provided.');
      this.loading.set(false);
      return;
    }
    this.formService.get(Number(idStr)).subscribe({
      next: (f) => {
        this.form.set(f);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error || 'Failed to load form.');
        this.loading.set(false);
      },
    });
  }
}
