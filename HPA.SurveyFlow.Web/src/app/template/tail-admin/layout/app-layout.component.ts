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
        <div class="flex-1 overflow-y-auto overflow-x-hidden">
          <div class="p-4 mx-auto max-w-screen-2xl md:p-6">
            <router-outlet />
          </div>
        </div>
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
  @Output() signOut = new EventEmitter<void>();

  sidebar = inject(SidebarService);
  theme = inject(ThemeService);
}
