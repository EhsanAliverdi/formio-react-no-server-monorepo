import {
  Component,
  OnInit,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="w-full">
      <div class="rounded-2xl border border-gray-200 bg-white p-6">
        <h1 class="text-xl font-semibold text-gray-800 mb-6">My Profile</h1>

        @if (error()) {
          <div class="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">{{ error() }}</div>
        }
        @if (saveSuccess()) {
          <div class="rounded border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700 mb-4">Profile updated successfully.</div>
        }
        @if (loading()) {
          <div class="text-gray-500">Loading…</div>
        } @else if (user()) {
          <!-- Avatar -->
          <div class="flex items-center gap-4 mb-6">
            <div class="h-16 w-16 rounded-full bg-gray-200 overflow-hidden">
              @if (user()!.avatar_url) {
                <img [src]="user()!.avatar_url" class="h-full w-full object-cover" />
              } @else {
                <div class="h-full w-full flex items-center justify-center text-gray-600 font-semibold text-xl">{{ initials() }}</div>
              }
            </div>
            <div>
              <div class="text-sm font-medium mb-1">{{ user()!.email }}</div>
              <input
                type="file"
                accept="image/*"
                class="text-sm"
                (change)="onAvatarChange($event)"
              />
              @if (avatarUploading()) {
                <span class="text-xs text-gray-500 ml-1">Uploading…</span>
              }
            </div>
          </div>

          <!-- Form grid -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label class="block text-sm font-medium mb-1">Display Name</label>
              <input class="w-full rounded border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="displayName" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">First Name</label>
              <input class="w-full rounded border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="firstName" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Last Name</label>
              <input class="w-full rounded border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="lastName" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Phone</label>
              <input class="w-full rounded border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="phone" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Job Title</label>
              <input class="w-full rounded border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="jobTitle" />
            </div>
            <div>
              <label class="block text-sm font-medium mb-1">Department</label>
              <input class="w-full rounded border border-gray-300 px-3 py-2 text-sm" [(ngModel)]="department" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium mb-1">Bio</label>
              <textarea
                class="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                rows="3"
                [(ngModel)]="bio"
              ></textarea>
            </div>
          </div>

          <div class="mt-6 flex items-center gap-3">
            <button
              class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              (click)="save()"
              [disabled]="saving()"
            >
              {{ saving() ? 'Saving…' : 'Save changes' }}
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class MyProfileComponent implements OnInit {
  private userService = inject(UserService);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  saveSuccess = signal(false);
  user = signal<User | null>(null);
  avatarUploading = signal(false);

  // Form fields (plain properties for ngModel)
  displayName = '';
  firstName = '';
  lastName = '';
  phone = '';
  jobTitle = '';
  department = '';
  bio = '';
  timezone = '';

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userService.getMe().subscribe({
      next: (u) => {
        this.user.set(u);
        this.displayName = u.display_name || '';
        this.firstName = u.first_name || '';
        this.lastName = u.last_name || '';
        this.phone = u.phone || '';
        this.jobTitle = u.job_title || '';
        this.department = u.department || '';
        this.bio = u.bio || '';
        this.timezone = u.timezone || '';
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load profile.');
        this.loading.set(false);
      },
    });
  }

  initials(): string {
    const u = this.user();
    if (!u) return '?';
    if (u.first_name && u.last_name) {
      return (u.first_name[0] + u.last_name[0]).toUpperCase();
    }
    const local = u.email.split('@')[0];
    if (!local) return '?';
    if (local.length === 1) return local.toUpperCase();
    return (local[0] + local[local.length - 1]).toUpperCase();
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.avatarUploading.set(true);
    this.userService.uploadAvatar(file).subscribe({
      next: (res) => {
        this.avatarUploading.set(false);
        const current = this.user();
        if (current && res?.avatar_url) {
          this.user.set({ ...current, avatar_url: res.avatar_url });
        } else {
          this.loadProfile();
        }
      },
      error: () => {
        this.avatarUploading.set(false);
        this.error.set('Failed to upload avatar.');
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    this.saveSuccess.set(false);

    this.userService.updateMe({
      display_name: this.displayName,
      first_name: this.firstName,
      last_name: this.lastName,
      phone: this.phone,
      job_title: this.jobTitle,
      department: this.department,
      bio: this.bio,
      timezone: this.timezone,
    }).subscribe({
      next: (res) => {
        if (res.user) {
          this.user.set(res.user);
        }
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 4000);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Failed to save profile.');
      },
    });
  }
}
