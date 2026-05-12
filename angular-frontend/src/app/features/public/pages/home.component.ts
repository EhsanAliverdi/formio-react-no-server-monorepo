import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { FormService } from '../../../core/services/form.service';
import { SubmissionService } from '../../../core/services/submission.service';
import { Form, FormSubmission } from '../../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="max-w-4xl mx-auto p-6">

      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-gray-900">Welcome, {{ displayName() }}</h1>
        <p class="text-gray-500 mt-1">Fill out forms and track your submissions.</p>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex items-center justify-center py-16">
          <svg class="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <div class="mb-6 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <svg class="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p class="text-sm text-red-700">{{ error() }}</p>
        </div>
      }

      @if (!loading()) {
        <!-- Quick Summary Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 uppercase tracking-wide">Your Submissions</p>
              <p class="text-4xl font-bold text-indigo-600 mt-1">{{ submissions().length }}</p>
              <a routerLink="/forms/mysubmissions"
                 class="mt-2 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition">
                View all
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            <div class="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
              <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 uppercase tracking-wide">Available Forms</p>
              <p class="text-4xl font-bold text-emerald-600 mt-1">{{ forms().length }}</p>
              <a routerLink="/forms"
                 class="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-800 transition">
                Browse forms
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
            <div class="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
              <svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
          </div>
        </div>

        <!-- Recent Forms -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold text-gray-900">Recent Forms</h2>
            <a routerLink="/forms"
               class="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition">
              View all
            </a>
          </div>

          @if (recentForms().length === 0) {
            <div class="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p class="text-gray-500">No forms available yet.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (form of recentForms(); track form.id) {
                <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4 hover:shadow-md transition">
                  <div class="flex items-start gap-3">
                    <div class="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <svg class="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 class="text-sm font-semibold text-gray-900 leading-snug">{{ form.name }}</h3>
                  </div>
                  <a [routerLink]="['/forms', form.id, 'fill']"
                     class="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
                    Fill Form
                  </a>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class HomeComponent implements OnInit {
  private authService = inject(AuthService);
  private formService = inject(FormService);
  private submissionService = inject(SubmissionService);
  private toastr = inject(ToastrService);

  loading = signal(true);
  error = signal<string | null>(null);
  forms = signal<Form[]>([]);
  submissions = signal<FormSubmission[]>([]);

  displayName = computed(() => {
    const user = this.authService.currentUser();
    return user?.display_name || user?.preferred_name || user?.first_name || user?.email || 'there';
  });

  recentForms = computed(() => this.forms().slice(0, 3));

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.error.set(null);

    let formsLoaded = false;
    let submissionsLoaded = false;
    let hasError = false;

    const checkDone = () => {
      if (formsLoaded && submissionsLoaded) {
        this.loading.set(false);
      }
    };

    this.formService.list().subscribe({
      next: (forms) => {
        this.forms.set(forms);
        formsLoaded = true;
        checkDone();
      },
      error: (err) => {
        if (!hasError) {
          hasError = true;
          const msg = err?.error?.error || err?.error?.message || 'Failed to load forms.';
          this.error.set(msg);
          this.toastr.error(msg, 'Error');
        }
        formsLoaded = true;
        checkDone();
      },
    });

    this.submissionService.listMine().subscribe({
      next: (res) => {
        this.submissions.set(res.items);
        submissionsLoaded = true;
        checkDone();
      },
      error: (err) => {
        if (!hasError) {
          hasError = true;
          const msg = err?.error?.error || err?.error?.message || 'Failed to load submissions.';
          this.error.set(msg);
          this.toastr.error(msg, 'Error');
        }
        submissionsLoaded = true;
        checkDone();
      },
    });
  }
}
