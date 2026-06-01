import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../../core/services/user.service';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';
import { AuthService } from '../../../core/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { User } from '../../../core/models';

interface UserFormModel {
  email: string;
  display_name: string;
  role: string;
  is_active: boolean;
  password: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, HelpTriggerComponent],
  template: `
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">Users <app-help-trigger helpKey="admin.users.list" label="Users help" /></h1>
          <p class="text-sm text-gray-500 mt-0.5">Manage user accounts and role assignments.</p>
        </div>
        @if (isAdmin()) {
          <button
            type="button"
            (click)="openAddModal()"
            class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        }
      </div>

      <!-- Error -->
      @if (error()) {
        <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center items-center py-16">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      <!-- Table -->
      @if (!loading()) {
        <div class="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table class="min-w-[640px] w-full text-sm">
            <thead>
              <tr class="bg-gray-50">
                <th scope="col" class="px-5 py-3 text-left font-medium text-gray-500">Name / Email</th>
                <th scope="col" class="px-5 py-3 text-left font-medium text-gray-500">Role</th>
                <th scope="col" class="px-5 py-3 text-left font-medium text-gray-500">Status</th>
                @if (isAdmin()) {
                  <th scope="col" class="px-5 py-3 text-left font-medium text-gray-500">Actions</th>
                }
              </tr>
            </thead>
            <tbody>
              @if (users().length === 0) {
                <tr>
                  <td [attr.colspan]="isAdmin() ? 4 : 3" class="px-5 py-8 text-center text-sm text-gray-500">
                    No users found.
                  </td>
                </tr>
              } @else {
                @for (u of users(); track u.id) {
                  <tr class="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td class="px-5 py-4">
                      <div class="font-medium text-gray-900">{{ u.display_name || (u.first_name && u.last_name ? u.first_name + ' ' + u.last_name : u.email) }}</div>
                      @if (u.display_name || u.first_name) {
                        <div class="text-xs text-gray-500">{{ u.email }}</div>
                      }
                    </td>
                    <td class="px-5 py-4">
                      <span
                        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        [class.bg-red-100]="u.role === 'admin'"
                        [class.text-red-800]="u.role === 'admin'"
                        [class.bg-blue-100]="u.role === 'editor'"
                        [class.text-blue-800]="u.role === 'editor'"
                        [class.bg-gray-100]="u.role !== 'admin' && u.role !== 'editor'"
                        [class.text-gray-800]="u.role !== 'admin' && u.role !== 'editor'"
                      >
                        {{ u.role }}
                      </span>
                    </td>
                    <td class="px-5 py-4">
                      @if (u.is_active) {
                        <span class="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">Active</span>
                      } @else {
                        <span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">Inactive</span>
                      }
                    </td>
                    @if (isAdmin()) {
                      <td class="px-5 py-4">
                        @if (deleteConfirm() === u.id) {
                          <div class="flex items-center gap-2">
                            <span class="text-xs text-red-700">Delete this user?</span>
                            <button
                              type="button"
                              (click)="confirmDelete(u.id)"
                              class="rounded bg-red-600 px-2.5 py-1 text-xs text-white hover:bg-red-700 transition"
                            >
                              Yes, delete
                            </button>
                            <button
                              type="button"
                              (click)="deleteConfirm.set(null)"
                              class="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        } @else {
                          <div class="flex items-center gap-2">
                            <button
                              type="button"
                              (click)="openEditModal(u)"
                              class="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              (click)="deleteConfirm.set(u.id)"
                              class="rounded border border-red-200 px-3 py-1.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 transition"
                            >
                              Delete
                            </button>
                          </div>
                        }
                      </td>
                    }
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Add / Edit Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div class="flex items-center justify-between border-b pb-4 mb-4">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ editUser() ? 'Edit User' : 'Add User' }}
              </h3>
              <button
                type="button"
                (click)="closeModal()"
                class="text-gray-500 hover:text-gray-700 text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <!-- Save error -->
            @if (saveError()) {
              <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {{ saveError() }}
              </div>
            }

            <div class="space-y-4">
              <!-- Email (only editable on create) -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Email <span class="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  [(ngModel)]="form.email"
                  [disabled]="!!editUser()"
                  placeholder="user@example.com"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>

              <!-- Display name -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  [(ngModel)]="form.display_name"
                  placeholder="Full name"
                  class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <!-- Role -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  [(ngModel)]="form.role"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  @for (role of availableRoles(); track role) {
                    <option [value]="role">{{ role | titlecase }}</option>
                  }
                </select>
              </div>

              <!-- Password (add only) -->
              @if (!editUser()) {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">
                    Password <span class="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    [(ngModel)]="form.password"
                    placeholder="Minimum 8 characters"
                    class="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              }

              <!-- Active -->
              <div class="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  [(ngModel)]="form.is_active"
                  class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label for="isActive" class="text-sm font-medium text-gray-700">Active</label>
              </div>
            </div>

            <div class="mt-6 flex items-center justify-end gap-3 border-t pt-4">
              <button
                type="button"
                (click)="closeModal()"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="button"
                (click)="saveUser()"
                [disabled]="saving()"
                class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
              >
                @if (saving()) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Saving…
                } @else {
                  {{ editUser() ? 'Save Changes' : 'Create User' }}
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);

  users = signal<User[]>([]);
  availableRoles = signal<string[]>(['admin', 'editor', 'viewer']);
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);
  showModal = signal(false);
  editUser = signal<User | null>(null);
  deleteConfirm = signal<number | null>(null);

  isAdmin = computed(() => this.authService.currentUser()?.role === 'admin');

  form: UserFormModel = {
    email: '',
    display_name: '',
    role: 'viewer',
    is_active: true,
    password: '',
  };

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (roles) => this.availableRoles.set(roles),
      error: () => {},
    });
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userService.list().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to load users.');
      },
    });
  }

  openAddModal(): void {
    this.editUser.set(null);
    this.form = { email: '', display_name: '', role: 'viewer', is_active: true, password: '' };
    this.saveError.set(null);
    this.showModal.set(true);
  }

  openEditModal(user: User): void {
    this.editUser.set(user);
    this.form = {
      email: user.email,
      display_name: user.display_name ?? '',
      role: user.role,
      is_active: user.is_active,
      password: '',
    };
    this.saveError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editUser.set(null);
    this.saveError.set(null);
  }

  saveUser(): void {
    if (!this.form.email.trim()) {
      this.saveError.set('Email is required.');
      return;
    }
    const editing = this.editUser();
    if (!editing && !this.form.password.trim()) {
      this.saveError.set('Password is required.');
      return;
    }

    this.saveError.set(null);
    this.saving.set(true);

    if (editing) {
      const data: any = {
        display_name: this.form.display_name,
        role: this.form.role,
        is_active: this.form.is_active ? 1 : 0,
      };
      this.userService.update(editing.id, data).subscribe({
        next: () => {
          this.saving.set(false);
          this.toastr.success('User updated successfully.');
          this.closeModal();
          this.loadUsers();
        },
        error: (err) => {
          this.saving.set(false);
          this.saveError.set(err?.error?.error || 'Failed to update user.');
          this.toastr.error(this.saveError()!);
        },
      });
    } else {
      const data: any = {
        email: this.form.email.trim(),
        display_name: this.form.display_name,
        role: this.form.role,
        password: this.form.password,
        is_active: 1,
      };
      this.userService.create(data).subscribe({
        next: () => {
          this.saving.set(false);
          this.toastr.success('User created successfully.');
          this.closeModal();
          this.loadUsers();
        },
        error: (err) => {
          this.saving.set(false);
          this.saveError.set(err?.error?.error || 'Failed to create user.');
          this.toastr.error(this.saveError()!);
        },
      });
    }
  }

  confirmDelete(id: number): void {
    this.userService.delete(id).subscribe({
      next: () => {
        this.toastr.success('User deleted.');
        this.deleteConfirm.set(null);
        this.users.update((list) => list.filter((u) => u.id !== id));
      },
      error: (err) => {
        this.toastr.error(err?.error?.error || 'Failed to delete user.');
        this.deleteConfirm.set(null);
      },
    });
  }
}
