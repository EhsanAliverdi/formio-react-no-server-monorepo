import {
  Component,
  OnInit,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../core/models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full space-y-6">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h1 class="text-xl font-semibold text-gray-800">Notifications</h1>
          <div class="mt-1 text-sm text-gray-600">Unread: <span class="font-medium">{{ unreadCount() }}</span></div>
        </div>
        <button
          class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          (click)="loadInbox()"
        >Refresh</button>
      </div>

      <div class="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 class="text-base font-semibold text-gray-800">Your inbox</h2>
        @if (error()) {
          <div class="mt-3 text-sm text-red-600">{{ error() }}</div>
        }
        @if (loading()) {
          <div class="mt-3 text-sm text-gray-500">Loading…</div>
        } @else if (items().length === 0) {
          <div class="mt-3 text-sm text-gray-500">No notifications.</div>
        } @else {
          <div class="mt-4 space-y-3">
            @for (n of items(); track n.id) {
              <div class="rounded-xl border border-gray-200 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-start gap-3 min-w-0">
                    <div class="mt-0.5 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700 shrink-0">
                      {{ initials(n.created_by_email) }}
                    </div>
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span
                          class="rounded-full px-2 py-0.5 text-xs font-medium"
                          [class]="levelBadgeClass(n.level, !n.read_at)"
                        >{{ n.level }}</span>
                        <div class="font-medium text-gray-800 truncate">{{ n.title }}</div>
                      </div>
                      <div class="mt-1 text-xs text-gray-500">
                        {{ formatDate(n.created_at) }}{{ n.created_by_email ? ' • From: ' + n.created_by_email : '' }}
                      </div>
                    </div>
                  </div>
                  @if (!n.read_at) {
                    <button
                      class="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50 shrink-0"
                      (click)="markRead(n.id)"
                    >Mark read</button>
                  }
                </div>
                <div class="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{{ n.body }}</div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);

  items = signal<Notification[]>([]);
  unreadCount = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadInbox();
  }

  loadInbox(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notificationService.list({ limit: 100, offset: 0 }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.unreadCount.set(res.unread_count);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load notifications.');
        this.loading.set(false);
      },
    });
  }

  markRead(id: number): void {
    this.notificationService.markRead(id).subscribe({
      next: () => {
        this.loadInbox();
        this.notificationService.refreshUnreadCount();
      },
      error: () => {},
    });
  }

  formatDate(s: string): string {
    return new Date(s).toLocaleString();
  }

  initials(email?: string): string {
    if (!email) return '?';
    const local = email.split('@')[0];
    if (!local) return '?';
    if (local.length === 1) return local.toUpperCase();
    return (local[0] + local[local.length - 1]).toUpperCase();
  }

  levelBadgeClass(level: string, unread: boolean): string {
    if (unread) {
      switch (level) {
        case 'low': return 'bg-blue-200 text-blue-800';
        case 'normal': return 'bg-green-200 text-green-800';
        case 'high': return 'bg-yellow-200 text-yellow-900';
        case 'critical': return 'bg-red-200 text-red-900';
        default: return 'bg-gray-200 text-gray-800';
      }
    }
    switch (level) {
      case 'low': return 'bg-blue-100 text-blue-700';
      case 'normal': return 'bg-green-100 text-green-700';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
}
