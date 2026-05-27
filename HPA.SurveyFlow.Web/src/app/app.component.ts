import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from './core/services/settings.service';
import { ApiService } from './core/services/api.service';
import { Formio } from 'formiojs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class AppComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private api = inject(ApiService);

  ngOnInit(): void {
    // Expose API base globally so custom Formio components can call our backend.
    const apiBase = this.api.apiUrl('');
    (window as any).__SURVEYFLOW_API_BASE__ = apiBase;

    // Install a Formio request plugin to inject the auth token on every
    // call to our own API. URL rewriting is done at schema-load time via patchSchemaUrls().
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


    this.settingsService.getSiteSettings().subscribe({
      next: settings => {
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
}
