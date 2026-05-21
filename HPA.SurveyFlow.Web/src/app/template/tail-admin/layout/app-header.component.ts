import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SidebarService } from '../services/sidebar.service';
import { ThemeService } from '../services/theme.service';

export interface HeaderUser {
  name?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="sticky top-0 flex w-full bg-white border-b border-gray-200 dark:border-gray-800 dark:bg-gray-900 z-40">
      <div class="flex items-center justify-between w-full px-4 py-3 lg:px-6">

        <!-- Left: sidebar toggle + mobile logo -->
        <div class="flex items-center gap-3">
          <button
            class="flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 text-gray-500 dark:border-gray-800 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition"
            (click)="handleToggle()"
            aria-label="Toggle Sidebar"
          >
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1H17M1 7H17M1 13H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>

        <!-- Right: theme + user -->
        <div class="flex items-center gap-2">

          <!-- Theme toggle -->
          <button
            class="flex items-center justify-center w-10 h-10 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition"
            (click)="theme.toggleTheme()"
            [title]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            @if (theme.theme() === 'dark') {
              <!-- Sun icon -->
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            } @else {
              <!-- Moon icon -->
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            }
          </button>

          <!-- Sign In link (unauthenticated) -->
          @if (!user && loginHref) {
            <a [routerLink]="loginHref"
               class="flex items-center gap-1.5 rounded-lg border border-brand-500 px-4 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 transition">
              Sign In
            </a>
          }

          <!-- User dropdown -->
          @if (user) {
            <div class="relative">
              <button
                class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-white/5 transition"
                (click)="userOpen.set(!userOpen())"
              >
                @if (user.avatarUrl) {
                  <img [src]="user.avatarUrl" [alt]="user.name ?? 'User'"
                       class="w-8 h-8 rounded-full object-cover ring-2 ring-brand-200" />
                } @else {
                  <div class="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-700 dark:text-brand-400 text-sm font-semibold ring-2 ring-brand-200">
                    {{ initials() }}
                  </div>
                }
                <span class="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-[120px] truncate">
                  {{ user.name || user.email }}
                </span>
                <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              @if (userOpen()) {
                <div class="absolute right-0 mt-2 w-52 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 py-1 z-50">
                  <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                    <p class="text-sm font-medium text-gray-800 dark:text-white truncate">{{ user.name || user.email }}</p>
                    @if (user.email && user.name) {
                      <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{{ user.email }}</p>
                    }
                  </div>
                  @if (profileHref) {
                    <a [routerLink]="profileHref" (click)="userOpen.set(false)"
                       class="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                      <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </a>
                  }
                  <div class="border-t border-gray-100 dark:border-gray-800 my-1"></div>
                  <button
                    (click)="onSignOut(); userOpen.set(false)"
                    class="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </header>
  `,
})
export class AppHeaderComponent {
  @Input() user?: HeaderUser;
  @Input() profileHref?: string;
  @Input() loginHref?: string;
  @Output() signOut = new EventEmitter<void>();

  sidebar = inject(SidebarService);
  theme = inject(ThemeService);

  userOpen = signal(false);

  initials(): string {
    const name = this.user?.name ?? this.user?.email ?? '';
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  handleToggle(): void {
    if (window.innerWidth >= 1024) {
      this.sidebar.toggleSidebar();
    } else {
      this.sidebar.toggleMobileSidebar();
    }
  }

  onSignOut(): void {
    this.signOut.emit();
  }
}
