import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { SiteSettings, AuthedUser } from '../../core/models';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">

      <!-- Top Navbar -->
      <header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16">

            <!-- Logo / Site name -->
            <div class="flex items-center gap-3">
              @if (logoUrl()) {
                <img [src]="logoUrl()" [alt]="siteName()" class="h-8 w-auto" />
              } @else {
                <div class="flex items-center gap-2">
                  <svg class="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span class="text-lg font-bold text-gray-900">{{ siteName() }}</span>
                </div>
              }
            </div>

            <!-- Desktop nav links -->
            <nav class="hidden md:flex items-center gap-1">
              <a routerLink="/"
                routerLinkActive="bg-indigo-50 text-indigo-700"
                [routerLinkActiveOptions]="{ exact: true }"
                class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition">
                Home
              </a>
              <a routerLink="/forms"
                routerLinkActive="bg-indigo-50 text-indigo-700"
                class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition">
                Forms
              </a>
              <a routerLink="/forms/mysubmissions"
                routerLinkActive="bg-indigo-50 text-indigo-700"
                class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition">
                My Submissions
              </a>
              <a routerLink="/notifications"
                routerLinkActive="bg-indigo-50 text-indigo-700"
                class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition">
                Notifications
              </a>
              <a routerLink="/myProfile"
                routerLinkActive="bg-indigo-50 text-indigo-700"
                class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition">
                Profile
              </a>
            </nav>

            <!-- Right: user info + logout -->
            <div class="flex items-center gap-3">
              <!-- User avatar + name -->
              <div class="flex items-center gap-2">
                @if (user()?.avatar_url) {
                  <img
                    [src]="user()!.avatar_url"
                    [alt]="displayName()"
                    class="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-200"
                  />
                } @else {
                  <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-semibold ring-2 ring-indigo-200">
                    {{ initials() }}
                  </div>
                }
                <span class="hidden sm:block text-sm font-medium text-gray-700">{{ displayName() }}</span>
              </div>

              <!-- Logout -->
              <button
                (click)="logout()"
                [disabled]="loggingOut()"
                class="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm
                       font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition
                       disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span class="hidden sm:inline">{{ loggingOut() ? 'Signing out…' : 'Logout' }}</span>
              </button>

              <!-- Mobile menu toggle -->
              <button
                (click)="mobileNavOpen.set(!mobileNavOpen())"
                class="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                aria-label="Toggle navigation"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile nav drawer -->
        @if (mobileNavOpen()) {
          <div class="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-1">
            <a routerLink="/" [routerLinkActiveOptions]="{ exact: true }"
              routerLinkActive="bg-indigo-50 text-indigo-700"
              (click)="mobileNavOpen.set(false)"
              class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition">
              Home
            </a>
            <a routerLink="/forms" routerLinkActive="bg-indigo-50 text-indigo-700"
              (click)="mobileNavOpen.set(false)"
              class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition">
              Forms
            </a>
            <a routerLink="/forms/mysubmissions" routerLinkActive="bg-indigo-50 text-indigo-700"
              (click)="mobileNavOpen.set(false)"
              class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition">
              My Submissions
            </a>
            <a routerLink="/notifications" routerLinkActive="bg-indigo-50 text-indigo-700"
              (click)="mobileNavOpen.set(false)"
              class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition">
              Notifications
            </a>
            <a routerLink="/myProfile" routerLinkActive="bg-indigo-50 text-indigo-700"
              (click)="mobileNavOpen.set(false)"
              class="block px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 transition">
              Profile
            </a>
          </div>
        }
      </header>

      <!-- Page content -->
      <main class="flex-1">
        <router-outlet />
      </main>

    </div>
  `,
})
export class PublicLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private router = inject(Router);

  user = this.authService.currentUser;
  mobileNavOpen = signal(false);
  loggingOut = signal(false);

  siteSettings = signal<SiteSettings | null>(null);

  siteName = computed(() => this.siteSettings()?.siteName ?? 'SurveyFlow');

  logoUrl = computed(() => {
    const s = this.siteSettings();
    return s?.logoExpandedLightUrl ?? null;
  });

  displayName = computed<string>(() => {
    const u = this.user();
    if (!u) return '';
    return u.preferred_name ?? u.display_name ?? u.first_name ?? u.email;
  });

  initials = computed<string>(() => {
    const name = this.displayName();
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  });

  ngOnInit(): void {
    this.settingsService.getSiteSettings().subscribe({
      next: s => this.siteSettings.set(s),
      error: () => {},
    });
  }

  logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
