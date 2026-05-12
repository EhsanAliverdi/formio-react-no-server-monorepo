import { Component, Input, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SidebarService } from '../services/sidebar.service';

export interface NavItem {
  name: string;
  path?: string;
  icon: string; // SVG path d attribute
  iconViewBox?: string;
  subItems?: { name: string; path: string }[];
}

export interface SidebarBranding {
  href?: string;
  expandedLightSrc?: string;
  expandedDarkSrc?: string;
  collapsedSrc?: string;
  alt?: string;
  expandedWidth?: number;
  expandedHeight?: number;
  collapsedSize?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside
      [class]="sidebarClass()"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
    >
      <!-- Logo -->
      <div class="py-8 flex" [class.justify-center]="!showLabels()" [class.justify-start]="showLabels()">
        <a [routerLink]="branding?.href ?? '/'">
          @if (showLabels()) {
            @if (branding?.expandedLightSrc) {
              <img
                class="dark:hidden"
                [src]="branding!.expandedLightSrc"
                [alt]="branding?.alt ?? 'Logo'"
                [width]="branding?.expandedWidth ?? 150"
                [height]="branding?.expandedHeight ?? 40"
              />
              <img
                class="hidden dark:block"
                [src]="branding?.expandedDarkSrc ?? branding!.expandedLightSrc"
                [alt]="branding?.alt ?? 'Logo'"
                [width]="branding?.expandedWidth ?? 150"
                [height]="branding?.expandedHeight ?? 40"
              />
            } @else {
              <div class="h-10 w-36 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                <span class="text-sm font-bold text-gray-700 dark:text-white">SurveyFlow</span>
              </div>
            }
          } @else {
            @if (branding?.collapsedSrc) {
              <img
                [src]="branding!.collapsedSrc"
                [alt]="branding?.alt ?? 'Logo'"
                [width]="branding?.collapsedSize ?? 32"
                [height]="branding?.collapsedSize ?? 32"
              />
            } @else {
              <div class="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center">
                <span class="text-xs font-bold text-white">SF</span>
              </div>
            }
          }
        </a>
      </div>

      <!-- Nav -->
      <div class="flex flex-1 flex-col overflow-y-auto no-scrollbar">
        <nav class="mb-6">
          <div class="flex flex-col gap-4">
            <div>
              <h2 class="mb-4 text-xs uppercase leading-5 text-gray-400 flex"
                  [class.justify-center]="!showLabels()">
                @if (showLabels()) {
                  <span>Menu</span>
                } @else {
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                  </svg>
                }
              </h2>
              <ul class="flex flex-col gap-1">
                @for (item of navItems; track item.name) {
                  <li>
                    @if (item.path) {
                      <a
                        [routerLink]="item.path"
                        routerLinkActive="menu-item-active"
                        [routerLinkActiveOptions]="{ exact: item.path === '/admin' || item.path === '/' }"
                        class="menu-item group"
                        [class.menu-item-inactive]="true"
                        [class.justify-center]="!showLabels()"
                        [title]="!showLabels() ? item.name : ''"
                        #rla="routerLinkActive"
                      >
                        <span class="inline-flex items-center justify-center w-6 h-6 shrink-0"
                              [class.menu-item-icon-active]="rla.isActive"
                              [class.menu-item-icon-inactive]="!rla.isActive">
                          <svg class="w-6 h-6" fill="none" stroke="currentColor"
                               [attr.viewBox]="item.iconViewBox ?? '0 0 24 24'">
                            @for (d of item.icon.split('|'); track $index) {
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" [attr.d]="d" />
                            }
                          </svg>
                        </span>
                        @if (showLabels()) {
                          <span class="whitespace-nowrap">{{ item.name }}</span>
                        }
                      </a>
                    }
                  </li>
                }
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </aside>

    <!-- Mobile backdrop -->
    @if (sidebar.isMobileOpen()) {
      <div
        class="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
        (click)="sidebar.toggleMobileSidebar()"
      ></div>
    }
  `,
})
export class AppSidebarComponent {
  @Input() navItems: NavItem[] = [];
  @Input() branding?: SidebarBranding;

  sidebar = inject(SidebarService);

  showLabels = computed(() =>
    this.sidebar.isExpanded() || this.sidebar.isHovered() || this.sidebar.isMobileOpen()
  );

  sidebarClass = computed(() => {
    const expanded = this.sidebar.isExpanded();
    const hovered = this.sidebar.isHovered();
    const mobileOpen = this.sidebar.isMobileOpen();

    const width = expanded || hovered ? 'w-[290px]' : 'w-[90px]';
    const mobileTranslate = mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0';

    return `fixed top-0 left-0 px-5 h-screen flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out z-50 ${width} ${mobileTranslate}`;
  });

  onMouseEnter(): void {
    if (!this.sidebar.isExpanded()) {
      this.sidebar.setHovered(true);
    }
  }

  onMouseLeave(): void {
    this.sidebar.setHovered(false);
  }
}
