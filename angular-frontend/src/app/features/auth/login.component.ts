import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 px-4">
      <div class="w-full max-w-md">

        <!-- Card -->
        <div class="bg-white rounded-2xl shadow-2xl overflow-hidden">

          <!-- Header band -->
          <div class="bg-gradient-to-r from-indigo-600 to-indigo-500 px-8 py-8 text-center">
            <div class="flex items-center justify-center mb-3">
              <svg class="w-10 h-10 text-white mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="text-white text-2xl font-bold tracking-tight">SurveyFlow</span>
            </div>
            <p class="text-indigo-100 text-sm">
              {{ isAdminMode() ? 'Admin Portal' : 'Welcome back' }}
            </p>
          </div>

          <!-- Form -->
          <div class="px-8 py-8">
            <h2 class="text-xl font-semibold text-gray-800 mb-6">
              Sign in to {{ isAdminMode() ? 'admin account' : 'your account' }}
            </h2>

            <!-- Error alert -->
            @if (errorMessage()) {
              <div class="mb-5 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <svg class="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="text-sm text-red-700">{{ errorMessage() }}</p>
              </div>
            }

            <form (ngSubmit)="onSubmit()" #loginForm="ngForm" novalidate>

              <!-- Email -->
              <div class="mb-5">
                <label for="email" class="block text-sm font-medium text-gray-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  [(ngModel)]="email"
                  required
                  autocomplete="email"
                  placeholder="you@example.com"
                  class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900
                         placeholder-gray-400 shadow-sm transition
                         focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                         disabled:bg-gray-50 disabled:text-gray-500"
                  [class.border-red-400]="emailTouched && !email"
                  (blur)="emailTouched = true"
                  [disabled]="loading()"
                />
                @if (emailTouched && !email) {
                  <p class="mt-1 text-xs text-red-500">Email is required.</p>
                }
              </div>

              <!-- Password -->
              <div class="mb-6">
                <label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <div class="relative">
                  <input
                    id="password"
                    [type]="showPassword ? 'text' : 'password'"
                    name="password"
                    [(ngModel)]="password"
                    required
                    autocomplete="current-password"
                    placeholder="••••••••"
                    class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-10 text-sm text-gray-900
                           placeholder-gray-400 shadow-sm transition
                           focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20
                           disabled:bg-gray-50 disabled:text-gray-500"
                    [class.border-red-400]="passwordTouched && !password"
                    (blur)="passwordTouched = true"
                    [disabled]="loading()"
                  />
                  <button
                    type="button"
                    (click)="showPassword = !showPassword"
                    class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    tabindex="-1"
                  >
                    @if (showPassword) {
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    } @else {
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    }
                  </button>
                </div>
                @if (passwordTouched && !password) {
                  <p class="mt-1 text-xs text-red-500">Password is required.</p>
                }
              </div>

              <!-- Submit -->
              <button
                type="submit"
                [disabled]="loading()"
                class="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold
                       text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2
                       focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                @if (loading()) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Signing in…</span>
                } @else {
                  <span>Sign In</span>
                }
              </button>

            </form>
          </div>
        </div>

        <p class="mt-6 text-center text-xs text-gray-400">
          &copy; {{ currentYear }} SurveyFlow. All rights reserved.
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = '';
  password = '';
  showPassword = false;
  emailTouched = false;
  passwordTouched = false;
  currentYear = new Date().getFullYear();

  loading = signal(false);
  errorMessage = signal('');
  isAdminMode = signal(false);

  ngOnInit(): void {
    const mode = this.route.snapshot.data?.['mode'];
    this.isAdminMode.set(mode === 'admin');

    // If already logged in, redirect
    if (this.authService.isLoggedIn()) {
      const dest = this.isAdminMode() ? '/admin' : '/';
      this.router.navigate([dest]);
    }
  }

  onSubmit(): void {
    this.emailTouched = true;
    this.passwordTouched = true;

    if (!this.email || !this.password) {
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.email, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        const dest = this.isAdminMode() ? '/admin' : '/';
        this.router.navigate([dest]);
      },
      error: (err) => {
        this.loading.set(false);
        const msg =
          err?.error?.error ||
          err?.error?.message ||
          'Invalid email or password. Please try again.';
        this.errorMessage.set(msg);
      },
    });
  }
}
