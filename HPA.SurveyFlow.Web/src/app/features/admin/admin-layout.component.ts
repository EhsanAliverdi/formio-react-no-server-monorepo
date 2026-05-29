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
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, AppLayoutComponent],
  template: `
    @if (loading()) {
      <div class="min-h-screen flex items-center justify-center text-gray-500 dark:text-gray-400">
        <svg class="animate-spin w-8 h-8 text-brand-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      </div>
    } @else {
      <app-layout
        [navItems]="navItems"
        [branding]="branding()"
        [user]="headerUser()"
        profileHref="/admin/profile"
        [copyrightText]="copyrightText()"
        [showCopyright]="showCopyright()"
        (signOut)="logout()"
      />
    }
  `,
})
export class AdminLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private settingsService = inject(SettingsService);
  private router = inject(Router);

  loading = signal(false);
  siteSettings = signal<SiteSettings | null>(null);
  user = this.authService.currentUser;

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
      role: u.role,
    };
  });

  readonly navItems: NavItem[] = [
    { name: 'Overview', path: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Forms', path: '/admin/forms', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'Submissions', path: '/admin/submissions', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
    { name: 'Reports', path: '/admin/reports', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { name: 'Datasets', path: '/admin/datasets', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4' },
    { name: 'Users', path: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { name: 'Jobs', path: '/admin/jobs', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { name: 'Synced Data', path: '/admin/synced-data', icon: 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4' },
    { name: 'Logs', path: '/admin/logs', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
    { name: 'Audit Log', path: '/admin/audit-log', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { name: 'API Keys', path: '/admin/api-keys', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
    { name: 'Integrations', path: '/admin/integrations', icon: 'M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244' },
    { name: 'Settings', path: '/admin/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z|M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  branding = computed<SidebarBranding>(() => {
    const settings = this.siteSettings();

    return {
      href: '/admin',
      expandedLightSrc: settings?.logoExpandedLightUrl?.trim() || '/images/logo/logo.svg',
      expandedDarkSrc: settings?.logoExpandedDarkUrl?.trim() || '/images/logo/logo-dark.svg',
      collapsedSrc: settings?.logoCollapsedUrl?.trim() || '/images/logo/logo-icon.svg',
      alt: settings?.siteName?.trim() || 'SurveyFlow',
      expandedWidth: Number(settings?.logoExpandedWidth) || 170,
      expandedHeight: Number(settings?.logoExpandedHeight) || 40,
      collapsedSize: Number(settings?.logoCollapsedSize) || 40,
    };
  });

  copyrightText = computed(() => this.siteSettings()?.copyrightText?.trim() || null);
  showCopyright = computed(() => !!this.siteSettings()?.showCopyright && !!this.copyrightText());

  ngOnInit(): void {
    this.settingsService.getSiteSettings().subscribe({ next: s => this.siteSettings.set(s), error: () => {} });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/admin/login']),
      error: () => this.router.navigate(['/admin/login']),
    });
  }
}
