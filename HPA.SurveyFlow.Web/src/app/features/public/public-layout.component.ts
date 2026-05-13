import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SettingsService } from '../../core/services/settings.service';
import { SiteSettings } from '../../core/models';
import { AppLayoutComponent } from '../../template/tail-admin/layout/app-layout.component';
import type { NavItem, SidebarBranding } from '../../template/tail-admin/layout/app-sidebar.component';
import type { HeaderUser } from '../../template/tail-admin/layout/app-header.component';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, AppLayoutComponent],
  template: `
    <app-layout
      [navItems]="navItems()"
      [branding]="branding()"
      [user]="headerUser()"
      notificationsHref="/notifications"
      profileHref="/myProfile"
      [loginHref]="user() ? undefined : '/login'"
      (signOut)="logout()"
    />
  `,
})
export class PublicLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private router = inject(Router);

  user = this.authService.currentUser;
  siteSettings = signal<SiteSettings | null>(null);

  headerUser = computed<HeaderUser | undefined>(() => {
    const u = this.user();
    if (!u) return undefined;
    const firstName = (u.first_name ?? '').trim();
    const lastName = (u.last_name ?? '').trim();
    const name = (u.preferred_name ?? u.display_name ?? '').trim()
      || (firstName && lastName ? (firstName + ' ' + lastName) : firstName)
      || u.email;
    return {
      name: name || u.email,
      email: u.email,
      avatarUrl: typeof u.avatar_url === 'string' ? u.avatar_url : undefined,
    };
  });

  readonly publicNavItems: NavItem[] = [
    { name: 'Home', path: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Forms', path: '/forms', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ];

  readonly authNavItems: NavItem[] = [
    { name: 'My Submissions', path: '/forms/mysubmissions', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
    { name: 'Notifications', path: '/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
    { name: 'My Profile', path: '/myProfile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  navItems = computed<NavItem[]>(() =>
    this.user() ? [...this.publicNavItems, ...this.authNavItems] : this.publicNavItems
  );

  branding = computed<SidebarBranding>(() => {
    const settings = this.siteSettings();

    return {
      href: '/',
      expandedLightSrc: settings?.logoExpandedLightUrl?.trim() || '/images/logo/logo.svg',
      expandedDarkSrc: settings?.logoExpandedDarkUrl?.trim() || '/images/logo/logo-dark.svg',
      collapsedSrc: settings?.logoCollapsedUrl?.trim() || '/images/logo/logo-icon.svg',
      alt: settings?.siteName?.trim() || 'SurveyFlow',
      expandedWidth: Number(settings?.logoExpandedWidth) || 170,
      expandedHeight: Number(settings?.logoExpandedHeight) || 40,
      collapsedSize: Number(settings?.logoCollapsedSize) || 40,
    };
  });

  ngOnInit(): void {
    this.settingsService.getSiteSettings().subscribe({ next: s => this.siteSettings.set(s), error: () => {} });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }
}
