import { Component, OnInit, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SettingsService } from '../../core/services/settings.service';
import { SiteSettings } from '../../core/models';

const SIDEBAR_KEY = 'sidebarCollapsed';

interface NavItem {
  label: string;
  path: string;
  exact?: boolean;
  icon: string; // SVG path d attribute(s) — pipe-separated for multi-path
  iconViewBox?: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="flex h-screen overflow-hidden bg-gray-100">

      <!-- ========== SIDEBAR ========== -->
      <aside
        [class]="collapsed()
          ? 'w-16 min-w-[4rem]'
          : 'w-64 min-w-[16rem]'"
        class="flex flex-col bg-gray-900 text-white transition-all duration-300 ease-in-out shrink-0 relative z-30"
      >
        <!-- Sidebar header -->
        <div class="flex items-center h-16 border-b border-gray-700/60 px-4 shrink-0"
             [class.justify-center]="collapsed()"
             [class.gap-3]="!collapsed()">

          @if (!collapsed()) {
            @if (logoCollapsedUrl()) {
              <img [src]="logoCollapsedUrl()" alt="logo" class="w-7 h-7 object-contain" />
            } @else {
              <svg class="w-7 h-7 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            <span class="text-white font-bold text-lg tracking-tight truncate">{{ siteName() }}</span>
          } @else {
            @if (logoCollapsedUrl()) {
              <img [src]="logoCollapsedUrl()" alt="logo" class="w-7 h-7 object-contain" />
            } @else {
              <svg class="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
          }
        </div>

        <!-- Nav links -->
        <nav class="flex-1 overflow-y-auto py-4 space-y-0.5 px-2">
          @for (item of navItems; track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-gray-800 text-white"
              [routerLinkActiveOptions]="{ exact: !!item.exact }"
              [title]="collapsed() ? item.label : ''"
              class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-gray-400
                     hover:bg-gray-800 hover:text-white transition-colors group"
              [class.justify-center]="collapsed()"
              [class.px-3]="!collapsed()"
            >
              <!-- Icon -->
              <svg class="w-5 h-5 shrink-0 group-hover:text-white transition-colors"
                   [class.text-indigo-400]="true"
                   fill="none" stroke="currentColor"
                   [attr.viewBox]="item.iconViewBox ?? '0 0 24 24'">
                @for (d of item.icon.split('|'); track $index) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" [attr.d]="d" />
                }
              </svg>
              <!-- Label -->
              @if (!collapsed()) {
                <span class="text-sm font-medium truncate">{{ item.label }}</span>
              }
            </a>
          }
        </nav>

        <!-- Collapse toggle at bottom -->
        <div class="border-t border-gray-700/60 p-2 shrink-0">
          <button
            (click)="toggleSidebar()"
            class="w-full flex items-center justify-center rounded-lg px-3 py-2 text-gray-400
                   hover:bg-gray-800 hover:text-white transition-colors"
            [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
          >
            @if (collapsed()) {
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5l7 7-7 7" />
              </svg>
            } @else {
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 19l-7-7 7-7" />
              </svg>
            }
          </button>
        </div>
      </aside>

      <!-- ========== MAIN COLUMN ========== -->
      <div class="flex flex-col flex-1 overflow-hidden">

        <!-- ===== TOP HEADER BAR ===== -->
        <header class="bg-white border-b border-gray-200 shadow-sm shrink-0 z-20">
          <div class="flex items-center justify-between h-16 px-4 sm:px-6">

            <!-- Left: hamburger -->
            <button
              (click)="toggleSidebar()"
              class="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
              aria-label="Toggle sidebar"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <!-- Right: notifications + user -->
            <div class="flex items-center gap-2">

              <!-- Notifications bell -->
              <a routerLink="/admin/notifications"
                class="relative p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                aria-label="Notifications"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                @if (unreadCount() > 0) {
                  <span class="absolute top-1 right-1 flex h-4 w-4 items-center justify-center
                               rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                    {{ unreadCount() > 99 ? '99+' : unreadCount() }}
                  </span>
                }
              </a>

              <!-- User dropdown trigger -->
              <div class="relative" (clickOutside)="userMenuOpen.set(false)">
                <button
                  (click)="userMenuOpen.set(!userMenuOpen())"
                  class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition"
                >
                  @if (user()?.avatar_url) {
                    <img
                      [src]="user()!.avatar_url"
                      [alt]="displayName()"
                      class="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-200"
                    />
                  } @else {
                    <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center
                                text-indigo-700 text-sm font-semibold ring-2 ring-indigo-200">
                      {{ initials() }}
                    </div>
                  }
                  <span class="hidden sm:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {{ displayName() }}
                  </span>
                  <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <!-- Dropdown menu -->
                @if (userMenuOpen()) {
                  <div class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <a
                      routerLink="/admin/profile"
                      (click)="userMenuOpen.set(false)"
                      class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </a>
                    <div class="border-t border-gray-100 my-1"></div>
                    <button
                      (click)="logout()"
                      [disabled]="loggingOut()"
                      class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600
                             hover:bg-red-50 transition disabled:opacity-50"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      {{ loggingOut() ? 'Signing out…' : 'Logout' }}
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>
        </header>

        <!-- ===== PAGE CONTENT ===== -->
        <main class="flex-1 overflow-y-auto">
          <router-outlet />
        </main>

      </div>
    </div>
  `,
})
export class AdminLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
  private settingsService = inject(SettingsService);
  private router = inject(Router);

  user = this.authService.currentUser;
  unreadCount = this.notificationService.unreadCount;

  collapsed = signal<boolean>(false);
  userMenuOpen = signal(false);
  loggingOut = signal(false);

  siteSettings = signal<SiteSettings | null>(null);

  siteName = computed(() => this.siteSettings()?.siteName ?? 'SurveyFlow');

  logoCollapsedUrl = computed(() => this.siteSettings()?.logoCollapsedUrl ?? null);

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

  readonly navItems: NavItem[] = [
    {
      label: 'Overview',
      path: '/admin',
      exact: true,
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    },
    {
      label: 'Forms',
      path: '/admin/forms',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
      label: 'Submissions',
      path: '/admin/submissions',
      icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
    },
    {
      label: 'Users',
      path: '/admin/users',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    },
    {
      label: 'Notifications',
      path: '/admin/notifications',
      icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
    },
    {
      label: 'Settings',
      path: '/admin/settings',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z|M15 12a3 3 0 11-6 0 3 3 0 016 0z',
    },
  ];

  ngOnInit(): void {
    // Restore sidebar state from localStorage
    const stored = localStorage.getItem(SIDEBAR_KEY);
    this.collapsed.set(stored === 'true');

    // Fetch unread notification count
    this.notificationService.refreshUnreadCount();

    // Fetch site settings
    this.settingsService.getSiteSettings().subscribe({
      next: s => this.siteSettings.set(s),
      error: () => {},
    });

    // Close user menu on route change
    this.router.events.subscribe(() => {
      this.userMenuOpen.set(false);
    });
  }

  toggleSidebar(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
  }

  logout(): void {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    this.userMenuOpen.set(false);
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
