import { Component, HostListener, Input, computed, inject, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { SidebarService } from '../services/sidebar.service';
import { environment } from '../../../../environments/environment';

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
      <div class="flex flex-1 flex-col overflow-y-auto overflow-x-visible no-scrollbar">
        <nav class="mb-6" aria-label="Main navigation">
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
                  <li class="relative" (mouseenter)="openDesktopSubmenu(item, $event)" (mouseleave)="closeDesktopSubmenu(item)">
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
                    } @else if (item.subItems) {
                      <button
                        type="button"
                        class="menu-item menu-item-inactive group"
                        [class.justify-center]="!showLabels()"
                        [title]="!showLabels() ? item.name : ''"
                        [attr.aria-expanded]="isMobileSubmenuOpen(item.name)"
                        (click)="toggleMobileSubmenu(item.name)"
                      >
                        <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center menu-item-icon-inactive">
                          <svg class="h-6 w-6" fill="none" stroke="currentColor" [attr.viewBox]="item.iconViewBox ?? '0 0 24 24'">
                            @for (d of item.icon.split('|'); track $index) {
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" [attr.d]="d" />
                            }
                          </svg>
                        </span>
                        @if (showLabels()) {
                          <span class="flex-1 whitespace-nowrap text-left">{{ item.name }}</span>
                          <svg class="h-4 w-4 transition-transform lg:hidden" [class.rotate-90]="isMobileSubmenuOpen(item.name)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                          </svg>
                        }
                      </button>

                      <!-- Desktop: flyout beside the left sidebar in both collapsed and expanded modes. -->
                      @if (isDesktop() && isDesktopSubmenuOpen(item.name)) {
                        <div class="fixed z-[70] w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl dark:border-gray-700 dark:bg-gray-800"
                             [style.left]="desktopFlyoutLeft()"
                             [style.top.px]="desktopFlyoutTop()"
                             (mouseenter)="keepDesktopSubmenuOpen(item.name)"
                             (mouseleave)="closeDesktopSubmenu(item)">
                          <p class="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{{ item.name }}</p>
                          <ul class="space-y-1">
                            @for (subItem of item.subItems; track subItem.path) {
                              <li>
                                <a [routerLink]="subItem.path" routerLinkActive="menu-dropdown-item-active" class="menu-dropdown-item menu-dropdown-item-inactive" (click)="closeAllSubmenus()">{{ subItem.name }}</a>
                              </li>
                            }
                          </ul>
                        </div>
                      }

                      <!-- Mobile: accordion remains closed until the parent is tapped. -->
                      @if (sidebar.isMobileOpen() && isMobileSubmenuOpen(item.name)) {
                        <ul class="ml-9 mt-1 space-y-1 lg:hidden">
                          @for (subItem of item.subItems; track subItem.path) {
                            <li>
                              <a [routerLink]="subItem.path" routerLinkActive="menu-dropdown-item-active" class="menu-dropdown-item menu-dropdown-item-inactive" (click)="closeAllSubmenus()">{{ subItem.name }}</a>
                            </li>
                          }
                        </ul>
                      }
                    }
                  </li>
                }
              </ul>
            </div>
          </div>
        </nav>

        <div
          class="mt-auto border-t border-gray-200 pt-4 text-gray-500 dark:border-gray-800 dark:text-gray-400"
          [class.text-center]="!showLabels()"
          [title]="versionTitle()"
        >
          @if (showLabels()) {
            <div class="text-xs font-medium leading-5">
              v{{ appVersion }}
            </div>
            @if (showEnvironment()) {
              <div class="text-[11px] leading-4 uppercase tracking-wide">
                {{ appEnvironment }}
              </div>
            }
          } @else {
            <div class="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-[11px] font-semibold text-gray-600 dark:bg-white/5 dark:text-gray-300">
              v
            </div>
          }
        </div>
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
  desktopSubmenu = signal<string | null>(null);
  mobileSubmenu = signal<string | null>(null);
  desktopFlyoutTop = signal(0);
  isDesktop = signal(window.innerWidth >= 1024);
  private desktopSubmenuCloseTimer?: ReturnType<typeof setTimeout>;
  readonly appVersion = environment.appVersion?.trim() || 'local';
  readonly appEnvironment = environment.appEnvironment?.trim() || 'development';

  showLabels = computed(() =>
    this.sidebar.isExpanded() || this.sidebar.isMobileOpen()
  );

  showEnvironment = computed(() => this.appEnvironment.toLowerCase() !== 'production');

  versionTitle = computed(() => {
    const environmentSuffix = this.showEnvironment() ? ` (${this.appEnvironment})` : '';
    return `Version ${this.appVersion}${environmentSuffix}`;
  });

  sidebarClass = computed(() => {
    const expanded = this.sidebar.isExpanded();
    const mobileOpen = this.sidebar.isMobileOpen();

    const width = expanded || mobileOpen ? 'w-[290px]' : 'w-[90px]';
    const mobileTranslate = mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0';

    return `fixed top-0 left-0 px-5 h-screen flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out z-50 ${width} ${mobileTranslate}`;
  });

  constructor() {
    effect(() => {
      const expanded = this.sidebar.isExpanded();
      const w = expanded ? '290px' : '90px';
      document.documentElement.style.setProperty('--sidebar-width', w);
    });
  }

  onMouseEnter(): void {
    this.sidebar.setHovered(false);
  }

  onMouseLeave(): void {
    this.sidebar.setHovered(false);
  }

  openDesktopSubmenu(item: NavItem, event: MouseEvent): void {
    if (!this.isDesktop()) return;
    // Always close any open flyout when entering a new nav row.
    // Only cancel the pending close timer when this item itself has a submenu to show.
    if (!item.subItems) {
      this.desktopSubmenu.set(null);
      this.cancelDesktopSubmenuClose();
      return;
    }
    this.cancelDesktopSubmenuClose();
    const target = event.currentTarget as HTMLElement | null;
    this.desktopFlyoutTop.set(target?.getBoundingClientRect().top ?? 0);
    this.desktopSubmenu.set(item.name);
  }

  closeDesktopSubmenu(item: NavItem): void {
    this.cancelDesktopSubmenuClose();
    this.desktopSubmenuCloseTimer = setTimeout(() => {
      if (this.desktopSubmenu() === item.name) this.desktopSubmenu.set(null);
    }, 180);
  }

  keepDesktopSubmenuOpen(name: string): void {
    this.cancelDesktopSubmenuClose();
    this.desktopSubmenu.set(name);
  }

  isDesktopSubmenuOpen(name: string): boolean {
    return this.desktopSubmenu() === name;
  }

  desktopFlyoutLeft(): string {
    return this.showLabels() ? '290px' : '90px';
  }

  toggleMobileSubmenu(name: string): void {
    if (this.isDesktop()) return;
    this.mobileSubmenu.update(current => current === name ? null : name);
  }

  isMobileSubmenuOpen(name: string): boolean {
    return this.mobileSubmenu() === name;
  }

  closeAllSubmenus(): void {
    this.cancelDesktopSubmenuClose();
    this.desktopSubmenu.set(null);
    this.mobileSubmenu.set(null);
    if (this.sidebar.isMobileOpen()) this.sidebar.toggleMobileSidebar();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.isDesktop.set(window.innerWidth >= 1024);
    this.closeAllSubmenus();
  }

  private cancelDesktopSubmenuClose(): void {
    if (this.desktopSubmenuCloseTimer) {
      clearTimeout(this.desktopSubmenuCloseTimer);
      this.desktopSubmenuCloseTimer = undefined;
    }
  }
}
