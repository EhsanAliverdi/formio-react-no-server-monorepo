import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div class="text-center max-w-md">
        <div class="mb-6 flex justify-center">
          <div class="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <svg class="h-10 w-10 text-indigo-500 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
        </div>
        <p class="text-6xl font-extrabold text-brand-500 dark:text-brand-400 mb-2">404</p>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">Page not found</h1>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div class="flex justify-center gap-3">
          <a routerLink="/" class="ta-btn ta-btn-primary px-5 py-2.5">
            Go home
          </a>
          <button type="button" (click)="history.back()" class="ta-btn ta-btn-secondary px-5 py-2.5">
            Go back
          </button>
        </div>
      </div>
    </div>
  `,
})
export class NotFoundComponent {
  history = history;
}
