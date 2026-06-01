import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from './core/services/settings.service';
import { HealthService } from './core/services/health.service';
import { ApiService } from './core/services/api.service';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog.component';
import { SlidePanelComponent } from './shared/components/slide-panel/slide-panel.component';
import { Formio } from 'formiojs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ConfirmDialogComponent, SlidePanelComponent],
  template: `
    @if (backendDown()) {
      <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div class="text-center max-w-md">
          <div class="mb-6 flex justify-center">
            <div class="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
              <svg class="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728M9.172 9.172a5 5 0 000 7.071M12 12h.01"/>
              </svg>
            </div>
          </div>
          <h1 class="text-2xl font-bold text-gray-900 mb-3">Server Unavailable</h1>
          <p class="text-sm text-gray-500 mb-8 leading-relaxed">
            We can't connect to the server right now. Please check your network connection
            or try again in a moment.
          </p>
          <button type="button" (click)="retryHealth()"
            [disabled]="retrying()"
            class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60 transition">
            @if (retrying()) {
              <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Retrying…
            } @else {
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Try again
            }
          </button>
        </div>
      </div>
    } @else if (ready()) {
      <router-outlet />
      <app-confirm-dialog />
      <app-slide-panel />
    }
  `,
})
export class AppComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private healthService = inject(HealthService);
  private api = inject(ApiService);

  ready = signal(false);
  backendDown = signal(false);
  retrying = signal(false);

  ngOnInit(): void {
    this.registerFormioPlugin();
    this.startHealthCheck();
  }

  retryHealth(): void {
    this.retrying.set(true);
    this.healthService.check().subscribe((ok) => {
      this.retrying.set(false);
      if (ok) {
        this.backendDown.set(false);
        this.ready.set(true);
        this.loadSettings();
      }
    });
  }

  private startHealthCheck(): void {
    this.healthService.check().subscribe((ok) => {
      if (ok) {
        this.ready.set(true);
        this.loadSettings();
      } else {
        this.backendDown.set(true);
      }
    });
  }

  private loadSettings(): void {
    this.settingsService.getSiteSettings().subscribe({
      next: (settings) => {
        const faviconUrl = settings.faviconUrl?.trim();
        if (!faviconUrl) return;
        const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
          ?? document.head.appendChild(document.createElement('link'));
        link.rel = 'icon';
        link.href = faviconUrl;
      },
      error: () => {},
    });
  }

  private registerFormioPlugin(): void {
    const apiBase = this.api.apiUrl('');
    (window as any).__SURVEYFLOW_API_BASE__ = apiBase;

    (Formio as any).registerPlugin({
      priority: 0,
      requestOptions: (options: any) => {
        const url: string = options?.url ?? '';
        if (url.includes(apiBase) || url.includes('/api/data-sources/')) {
          const token = localStorage.getItem('authToken');
          if (token) {
            if (!options.header) options.header = {};
            if (typeof options.header === 'object' && !(options.header instanceof Headers)) {
              options.header['Authorization'] = options.header['Authorization'] ?? `Bearer ${token}`;
            }
          }
        }
        return options;
      },
    }, 'surveyflow-auth');
  }
}
