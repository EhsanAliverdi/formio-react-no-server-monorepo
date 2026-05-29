import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfirmDialogService, ConfirmOptions } from './confirm-dialog.service';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (svc.state(); as s) {
      <div class="fixed inset-0 z-[9999] flex items-center justify-center px-4"
           role="dialog" aria-modal="true" [attr.aria-labelledby]="'cd-title'">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" (click)="svc.cancel()"></div>

        <!-- Panel -->
        <div class="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-6">
          <!-- Icon -->
          <div class="mb-4 flex items-center gap-3">
            @if (s.variant === 'danger') {
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                </svg>
              </div>
            } @else {
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
            }
            <h2 id="cd-title" class="text-base font-semibold text-gray-900">{{ s.title }}</h2>
          </div>

          <p class="mb-6 text-sm text-gray-600 leading-relaxed">{{ s.message }}</p>

          <div class="flex justify-end gap-3">
            <button type="button"
              class="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              (click)="svc.cancel()">
              {{ s.cancelLabel ?? 'Cancel' }}
            </button>
            <button type="button"
              [class]="s.variant === 'danger'
                ? 'rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition'
                : 'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition'"
              (click)="svc.confirm()">
              {{ s.confirmLabel ?? 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  svc = inject(ConfirmDialogService);
}
