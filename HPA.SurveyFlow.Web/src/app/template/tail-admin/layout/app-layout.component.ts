import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AppSidebarComponent, NavItem, SidebarBranding } from './app-sidebar.component';
import { AppHeaderComponent, HeaderUser } from './app-header.component';
import { SidebarService } from '../services/sidebar.service';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AppSidebarComponent, AppHeaderComponent],
  template: `
    <div class="flex h-dvh overflow-hidden bg-gray-50 dark:bg-gray-950">

      <!-- Sidebar -->
      <app-sidebar
        [navItems]="navItems"
        [branding]="branding"
      />

      <!-- Main column -->
      <div
        class="flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out"
        [ngClass]="sidebar.isExpanded() ? 'lg:ml-[290px]' : 'lg:ml-[90px]'"
      >
        <app-header
          [user]="user"
          [profileHref]="profileHref"
          [loginHref]="loginHref"
          (signOut)="signOut.emit()"
        />
        <main class="flex-1 overflow-y-auto overflow-x-hidden">
          <div class="mx-auto flex min-h-full w-full max-w-screen-2xl flex-col p-4  md:p-6">
            <div class="flex-1">
              @if (useRouterOutlet) {
                <router-outlet />
              } @else {
                <ng-content />
              }
            </div>
          </div>
        </main>
        @if (showCopyright && copyrightText) {
          <footer class="w-full border-t border-gray-200 bg-white px-4 py-3 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 lg:px-6">
            {{ copyrightText }}
          </footer>
        }
      </div>
    </div>
  `,
})
export class AppLayoutComponent {
  @Input() navItems: NavItem[] = [];
  @Input() branding?: SidebarBranding;
  @Input() user?: HeaderUser;
  @Input() profileHref?: string;
  @Input() loginHref?: string;
  @Input() copyrightText?: string | null;
  @Input() showCopyright = false;
  @Input() useRouterOutlet = true;
  @Output() signOut = new EventEmitter<void>();

  sidebar = inject(SidebarService);
  theme = inject(ThemeService);
}
