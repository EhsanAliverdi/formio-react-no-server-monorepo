import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NotificationService } from '../../../core/services/notification.service';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { AdminNotification, User } from '../../../core/models';

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule, TitleCasePipe],
  template: `
    <div class="w-full space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-gray-800">Admin notifications</h1>
          <p class="text-sm text-gray-600 mt-1">Broadcast notifications to users.</p>
        </div>
        <button
          class="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
          (click)="loadSent()"
        >Refresh</button>
      </div>

      @if (isAdmin()) {
        <div class="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 class="text-base font-semibold">Send notification</h2>
          <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label class="block text-sm font-medium mb-1">Title</label>
              <input
                class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                [(ngModel)]="titleModel"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Importance</label>
              <select
                class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                [(ngModel)]="levelModel"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div class="lg:col-span-2">
              <label class="block text-sm font-medium mb-1">Message</label>
              <textarea
                class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                rows="4"
                [(ngModel)]="bodyModel"
              ></textarea>
            </div>

            <div class="lg:col-span-2">
              <label class="block text-sm font-medium mb-2">Recipients</label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 text-sm">
                  <input type="radio" name="target" value="custom" [(ngModel)]="targetModeModel" />
                  Roles and/or selected users
                </label>
                <label class="flex items-center gap-2 text-sm">
                  <input type="radio" name="target" value="all" [(ngModel)]="targetModeModel" />
                  All active users
                </label>
              </div>

              @if (targetModeModel === 'custom') {
                <div class="mt-3 rounded-lg border border-gray-200 p-3">
                  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <div class="text-sm font-medium mb-2">By role</div>
                      @for (r of ['admin','editor','viewer']; track r) {
                        <label class="flex items-center gap-2 text-sm mb-1">
                          <input
                            type="checkbox"
                            [checked]="selectedRolesIncludes(r)"
                            (change)="toggleRole(r)"
                          />
                          {{ r | titlecase }}
                        </label>
                      }
                    </div>
                    <div>
                      <div class="text-sm font-medium mb-2">By user</div>
                      <input
                        class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        placeholder="Search users..."
                        [(ngModel)]="userSearchModel"
                        (ngModelChange)="onUserSearchChange($event)"
                      />
                      <div class="mt-2 text-xs text-gray-500">Selected: {{ selectedUserIdsModel.length }}</div>
                    </div>
                  </div>
                  <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    @if (loadingUsers()) {
                      <div class="text-sm text-gray-500">Loading users…</div>
                    } @else {
                      @for (u of filteredUsers(); track u.id) {
                        <label class="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            [checked]="selectedUserIdsIncludes(u.id)"
                            (change)="toggleUser(u.id)"
                          />
                          {{ u.email }} ({{ u.role }})
                        </label>
                      }
                    }
                  </div>
                </div>
              }
            </div>

            <div class="lg:col-span-2 flex items-center gap-3">
              <button
                class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                (click)="send()"
                [disabled]="creating()"
              >
                {{ creating() ? 'Sending…' : 'Send' }}
              </button>
              @if (createError()) {
                <div class="text-sm text-red-600">{{ createError() }}</div>
              }
              @if (createSuccess()) {
                <div class="text-sm text-green-600">{{ createSuccess() }}</div>
              }
            </div>
          </div>
        </div>
      }

      <div class="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 class="text-base font-semibold">Sent notifications</h2>
        @if (sentError()) {
          <div class="mt-3 text-sm text-red-600">{{ sentError() }}</div>
        }
        @if (loadingSent()) {
          <div class="mt-3 text-sm text-gray-500">Loading…</div>
        } @else if (sentItems().length === 0) {
          <div class="mt-3 text-sm text-gray-500">No sent notifications.</div>
        } @else {
          <div class="mt-4 space-y-3">
            @for (n of sentItems(); track n.id) {
              <div class="rounded-xl border border-gray-200 p-4">
                <div class="flex items-start gap-3">
                  <div class="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-700 shrink-0">
                    {{ initials(n.created_by_email) }}
                  </div>
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span
                        class="rounded-full px-2 py-0.5 text-xs font-medium"
                        [class]="levelBadgeClass(n.level)"
                      >{{ n.level }}</span>
                      <div class="font-medium text-gray-800">{{ n.title }}</div>
                    </div>
                    <div class="mt-1 text-xs text-gray-500">
                      {{ formatDate(n.created_at) }}
                      @if (n.created_by_email) { • From: {{ n.created_by_email }} }
                      • Recipients: {{ n.recipient_count }} • Read: {{ n.read_count }}
                    </div>
                  </div>
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
export class AdminNotificationsComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private userService = inject(UserService);
  private authService = inject(AuthService);

  sentItems = signal<AdminNotification[]>([]);
  loadingSent = signal(true);
  sentError = signal<string | null>(null);
  creating = signal(false);
  createError = signal<string | null>(null);
  createSuccess = signal<string | null>(null);
  users = signal<User[]>([]);
  loadingUsers = signal(false);

  // Form state (plain properties for ngModel)
  titleModel = '';
  bodyModel = '';
  levelModel = 'normal';
  targetModeModel: 'all' | 'custom' = 'custom';
  selectedRolesModel: string[] = [];
  selectedUserIdsModel: number[] = [];
  userSearchModel = '';

  private searchSubject = new Subject<string>();
  private searchSub?: Subscription;

  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  filteredUsers(): User[] {
    const q = this.userSearchModel.toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(u => u.email.toLowerCase().includes(q));
  }

  ngOnInit(): void {
    this.loadSent();
    if (this.isAdmin()) {
      this.loadUsers();
    }

    this.searchSub = this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => {
      // filtering is done reactively via filteredUsers()
    });
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  onUserSearchChange(val: string): void {
    this.searchSubject.next(val);
  }

  loadSent(): void {
    this.loadingSent.set(true);
    this.sentError.set(null);
    this.notificationService.adminList({ limit: 100, offset: 0 }).subscribe({
      next: res => {
        this.sentItems.set(res.items);
        this.loadingSent.set(false);
      },
      error: () => {
        this.sentError.set('Failed to load sent notifications.');
        this.loadingSent.set(false);
      },
    });
  }

  loadUsers(): void {
    this.loadingUsers.set(true);
    this.userService.list().subscribe({
      next: users => {
        this.users.set(users);
        this.loadingUsers.set(false);
      },
      error: () => {
        this.loadingUsers.set(false);
      },
    });
  }

  selectedRolesIncludes(r: string): boolean {
    return this.selectedRolesModel.includes(r);
  }

  toggleRole(r: string): void {
    if (this.selectedRolesModel.includes(r)) {
      this.selectedRolesModel = this.selectedRolesModel.filter(x => x !== r);
    } else {
      this.selectedRolesModel = [...this.selectedRolesModel, r];
    }
  }

  selectedUserIdsIncludes(id: number): boolean {
    return this.selectedUserIdsModel.includes(id);
  }

  toggleUser(id: number): void {
    if (this.selectedUserIdsModel.includes(id)) {
      this.selectedUserIdsModel = this.selectedUserIdsModel.filter(x => x !== id);
    } else {
      this.selectedUserIdsModel = [...this.selectedUserIdsModel, id];
    }
  }

  send(): void {
    if (!this.titleModel.trim() || !this.bodyModel.trim()) {
      this.createError.set('Title and message are required.');
      return;
    }

    this.creating.set(true);
    this.createError.set(null);
    this.createSuccess.set(null);

    const payload: any = {
      title: this.titleModel.trim(),
      body: this.bodyModel.trim(),
      level: this.levelModel,
      target: this.targetModeModel,
    };

    if (this.targetModeModel === 'custom') {
      payload.roles = this.selectedRolesModel;
      payload.user_ids = this.selectedUserIdsModel;
    }

    this.notificationService.adminCreate(payload).subscribe({
      next: () => {
        this.creating.set(false);
        this.createSuccess.set('Notification sent successfully!');
        this.titleModel = '';
        this.bodyModel = '';
        this.levelModel = 'normal';
        this.targetModeModel = 'custom';
        this.selectedRolesModel = [];
        this.selectedUserIdsModel = [];
        this.loadSent();
        setTimeout(() => this.createSuccess.set(null), 4000);
      },
      error: (err) => {
        this.creating.set(false);
        this.createError.set(err?.error?.message || 'Failed to send notification.');
      },
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

  levelBadgeClass(level: string): string {
    switch (level) {
      case 'low': return 'bg-blue-100 text-blue-700';
      case 'normal': return 'bg-green-100 text-green-700';
      case 'high': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-700';
    }
  }
}
