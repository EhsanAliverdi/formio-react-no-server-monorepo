import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SettingsService } from './core/services/settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`
})
export class AppComponent implements OnInit {
  private settingsService = inject(SettingsService);

  ngOnInit(): void {
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
