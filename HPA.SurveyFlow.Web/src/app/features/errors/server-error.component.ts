import { Component, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-server-error',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div class="text-center max-w-md">
        <div class="mb-6 flex justify-center">
          <div class="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg class="h-10 w-10 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
        </div>
        <p class="text-6xl font-extrabold text-red-500 dark:text-red-400 mb-2">{{ code }}</p>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">{{ title }}</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">{{ message }}</p>
        <div class="flex justify-center gap-3">
          <a routerLink="/" class="ta-btn ta-btn-primary px-5 py-2.5">
            Go home
          </a>
          <button type="button" (click)="reload()" class="ta-btn ta-btn-secondary px-5 py-2.5">
            Try again
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ServerErrorComponent {
  private route = inject(ActivatedRoute);

  get code(): string { return this.route.snapshot.data?.['code'] ?? '500'; }
  get title(): string { return this.route.snapshot.data?.['title'] ?? 'Something went wrong'; }
  get message(): string {
    return this.route.snapshot.data?.['message']
      ?? 'An unexpected error occurred on our end. Please try again in a moment.';
  }

  reload(): void { window.location.reload(); }
}
