import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { SettingsService } from '../../core/services/settings.service';
import { SiteSettings } from '../../core/models';
import { AppLayoutComponent } from '../../template/tail-admin/layout/app-layout.component';
import type { NavItem, SidebarBranding } from '../../template/tail-admin/layout/app-sidebar.component';
import type { HeaderUser, HeaderNotification } from '../../template/tail-admin/layout/app-header.component';

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
        [notifications]="headerNotifications()"
        notificationsHref="/admin/notifications"
        profileHref="/admin/profile"
        (signOut)="logout()"
      />
    }
  `,
})
export class AdminLayoutComponent implements OnInit {
  private authService = inject(AuthService);
  private notificationService = inject(NotificationService);
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

  headerNotifications = signal<HeaderNotification[]>([]);

  readonly navItems: NavItem[] = [
    { name: 'Overview', path: '/admin', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Forms', path: '/admin/forms', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'Submissions', path: '/admin/submissions', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
    { name: 'Users', path: '/admin/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { name: 'Notifications', path: '/admin/notifications', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
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

  ngOnInit(): void {
    this.notificationService.refreshUnreadCount();
    this.settingsService.getSiteSettings().subscribe({ next: s => this.siteSettings.set(s), error: () => {} });
    this.loadNotifications();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.loadNotifications());
  }

  private loadNotifications(): void {
    this.notificationService.list({ limit: 10, offset: 0 }).subscribe({
      next: res => {
        this.headerNotifications.set((res.items ?? []).map(n => ({
          id: n.id,
          title: n.title,
          message: n.body,
          timeLabel: n.created_at ? new Date(n.created_at).toLocaleString() : undefined,
          href: '/admin/notifications',
          read: Boolean(n.read_at),
          unread: !n.read_at,
        })));
      },
      error: () => {},
    });
  }

  logout(): void {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/admin/login']),
      error: () => this.router.navigate(['/admin/login']),
    });
  }
}
