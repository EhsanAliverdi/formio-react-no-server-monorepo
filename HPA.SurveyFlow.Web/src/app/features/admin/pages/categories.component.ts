import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../../core/services/category.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { ToastrService } from 'ngx-toastr';
import { Category } from '../../../core/models';

interface CategoryFormModel {
  slug: string;
  name: string;
  description: string;
  visibility: 'public' | 'restricted';
  image_url: string;
  icon_key: string;
  show_title: boolean;
  show_description: boolean;
  show_button: boolean;
  button_text: string;
  layout_mode: 'card' | 'list';
  columns: number;
  card_style: 'overlay' | 'compact';
}

const emptyForm = (): CategoryFormModel => ({
  slug: '',
  name: '',
  description: '',
  visibility: 'public',
  image_url: '',
  icon_key: '',
  show_title: true,
  show_description: true,
  show_button: true,
  button_text: '',
  layout_mode: 'card',
  columns: 3,
  card_style: 'overlay',
});

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="p-6">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Categories</h1>
          <p class="text-sm text-gray-500 mt-0.5">Manage shared form categories and their access settings.</p>
        </div>
        @if (canEdit()) {
          <button type="button" (click)="openCreate()"
            class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            New Category
          </button>
        }
      </div>

      @if (error()) {
        <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
      }

      @if (loading()) {
        <div class="flex justify-center items-center py-16">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else {
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Name / Slug</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Visibility</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Forms</th>
                <th class="px-5 py-3 text-left font-medium text-gray-500">Public URL</th>
                @if (canEdit()) {
                  <th class="px-5 py-3 text-left font-medium text-gray-500">Actions</th>
                }
              </tr>
            </thead>
            <tbody>
              @if (categories().length === 0) {
                <tr>
                  <td [attr.colspan]="canEdit() ? 5 : 4" class="px-5 py-10 text-center text-sm text-gray-400">
                    No categories yet. Create your first one.
                  </td>
                </tr>
              } @else {
                @for (cat of categories(); track cat.slug) {
                  <tr class="border-t border-gray-100 hover:bg-gray-50 transition">
                    <td class="px-5 py-4">
                      <div class="font-medium text-gray-900">{{ cat.name }}</div>
                      <div class="text-xs text-gray-400 font-mono mt-0.5">{{ cat.slug }}</div>
                    </td>
                    <td class="px-5 py-4">
                      @if (cat.visibility === 'restricted') {
                        <span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                          </svg>
                          Restricted
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"/>
                          </svg>
                          Public
                        </span>
                      }
                    </td>
                    <td class="px-5 py-4">
                      <span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold"
                        [class.bg-indigo-100]="cat.form_count > 0"
                        [class.text-indigo-700]="cat.form_count > 0"
                        [class.bg-gray-100]="cat.form_count === 0"
                        [class.text-gray-500]="cat.form_count === 0">
                        {{ cat.form_count }}
                      </span>
                    </td>
                    <td class="px-5 py-4">
                      <a [routerLink]="['/category', cat.slug]" target="_blank"
                        class="text-xs text-indigo-600 hover:text-indigo-800 font-mono hover:underline">
                        /category/{{ cat.slug }}
                      </a>
                    </td>
                    @if (canEdit()) {
                      <td class="px-5 py-4">
                        <div class="flex items-center gap-2">
                          <button type="button" (click)="openEdit(cat)"
                            class="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition">
                            Edit
                          </button>
                          @if (isAdmin()) {
                            <button type="button" (click)="deleteCategory(cat)"
                              class="rounded border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100 transition">
                              Delete
                            </button>
                          }
                        </div>
                      </td>
                    }
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }

      <!-- Create / Edit Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div class="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <div class="flex items-center justify-between border-b pb-4 mb-4">
              <h3 class="text-lg font-semibold text-gray-900">
                {{ editCategory() ? 'Edit Category' : 'New Category' }}
              </h3>
              <button type="button" (click)="closeModal()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
            </div>

            @if (saveError()) {
              <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ saveError() }}</div>
            }

            <div class="space-y-4">
              <!-- Slug (read-only on edit) -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Slug <span class="text-red-500">*</span>
                </label>
                <input type="text" [(ngModel)]="form.slug" placeholder="pre-start"
                  [disabled]="!!editCategory()"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400 font-mono"/>
                <p class="mt-1 text-xs text-gray-400">Used in the URL: <code>/category/{{ form.slug || 'slug' }}</code>. Cannot be changed after creation.</p>
              </div>

              <!-- Name -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  Name <span class="text-red-500">*</span>
                </label>
                <input type="text" [(ngModel)]="form.name" placeholder="Pre-Start Checks"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>

              <!-- Description -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea [(ngModel)]="form.description" rows="2" placeholder="Optional description shown to users"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
              </div>

              <!-- Visibility -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" [(ngModel)]="form.visibility" value="public"
                      class="h-4 w-4 border-gray-300 text-indigo-600"/>
                    <span class="text-sm text-gray-700"><strong>Public</strong> <span class="text-gray-400 font-normal">— anyone can access</span></span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" [(ngModel)]="form.visibility" value="restricted"
                      class="h-4 w-4 border-gray-300 text-indigo-600"/>
                    <span class="text-sm text-gray-700"><strong>Restricted</strong> <span class="text-gray-400 font-normal">— requires login</span></span>
                  </label>
                </div>
                @if (form.visibility === 'restricted') {
                  <p class="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                    Users must be logged in. Access is controlled by the allowed roles and users set on each form.
                  </p>
                }
              </div>

              <!-- Image URL -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Card Image URL</label>
                <input type="url" [(ngModel)]="form.image_url" placeholder="https://…"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                @if (form.image_url) {
                  <img [src]="form.image_url" alt="Preview" class="mt-2 h-20 rounded-lg object-cover border border-gray-200"/>
                }
              </div>

              <!-- Icon key -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Icon key <span class="text-gray-400 font-normal">(used when no image)</span></label>
                <input type="text" [(ngModel)]="form.icon_key" placeholder="fa:FaTruck"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>

              <!-- Layout -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Layout</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" [(ngModel)]="form.layout_mode" value="card"
                      class="h-4 w-4 border-gray-300 text-indigo-600"/>
                    <span class="text-sm text-gray-700"><strong>Card view</strong></span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" [(ngModel)]="form.layout_mode" value="list"
                      class="h-4 w-4 border-gray-300 text-indigo-600"/>
                    <span class="text-sm text-gray-700"><strong>List view</strong></span>
                  </label>
                </div>
              </div>

              <!-- Columns (card view only) -->
              @if (form.layout_mode === 'card') {
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Columns <span class="text-gray-400 font-normal">({{ form.columns }})</span>
                  </label>
                  <input type="range" [(ngModel)]="form.columns" min="1" max="4" step="1"
                    class="w-full max-w-xs accent-indigo-600"/>
                  <div class="flex justify-between text-xs text-gray-400 max-w-xs mt-0.5">
                    <span>1</span><span>2</span><span>3</span><span>4</span>
                  </div>
                </div>

                <!-- Card style -->
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">Card style</label>
                  <div class="flex gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" [(ngModel)]="form.card_style" value="overlay"
                        class="h-4 w-4 border-gray-300 text-indigo-600"/>
                      <span class="text-sm text-gray-700"><strong>Overlay</strong> <span class="text-gray-400 font-normal">— hover to reveal</span></span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                      <input type="radio" [(ngModel)]="form.card_style" value="compact"
                        class="h-4 w-4 border-gray-300 text-indigo-600"/>
                      <span class="text-sm text-gray-700"><strong>Compact</strong> <span class="text-gray-400 font-normal">— always visible</span></span>
                    </label>
                  </div>
                </div>
              }

              <!-- Display options -->
              <div class="space-y-2">
                <p class="text-sm font-medium text-gray-700">Card display</p>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.show_title"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <span class="text-sm text-gray-700">Show form title on card</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.show_description"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <span class="text-sm text-gray-700">Show description on card</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="form.show_button"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <span class="text-sm text-gray-700">Show button</span>
                </label>
                @if (form.show_button) {
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Button text</label>
                    <input type="text" [(ngModel)]="form.button_text" placeholder="Start"
                      class="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  </div>
                }
              </div>
            </div>

            <div class="mt-6 flex items-center justify-end gap-3 border-t pt-4">
              <button type="button" (click)="closeModal()"
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition">
                Cancel
              </button>
              <button type="button" (click)="save()" [disabled]="saving()"
                class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
                @if (saving()) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  Saving…
                } @else {
                  {{ editCategory() ? 'Save Changes' : 'Create Category' }}
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class CategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private confirmDialog = inject(ConfirmDialogService);
  private toastr = inject(ToastrService);

  categories = signal<Category[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);
  showModal = signal(false);
  editCategory = signal<Category | null>(null);

  isAdmin = computed(() => this.authService.currentUser()?.role === 'admin');
  canEdit = computed(() => ['admin', 'editor'].includes(this.authService.currentUser()?.role ?? ''));

  form: CategoryFormModel = emptyForm();

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.categoryService.list().subscribe({
      next: (cats) => { this.categories.set(cats); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.error || 'Failed to load categories.'); },
    });
  }

  openCreate(): void {
    this.editCategory.set(null);
    this.form = emptyForm();
    this.saveError.set(null);
    this.showModal.set(true);
  }

  openEdit(cat: Category): void {
    this.editCategory.set(cat);
    this.form = {
      slug: cat.slug,
      name: cat.name,
      description: cat.description ?? '',
      visibility: cat.visibility,
      image_url: cat.image_url ?? '',
      icon_key: cat.icon_key ?? '',
      show_title: cat.show_title,
      show_description: cat.show_description,
      show_button: cat.show_button,
      button_text: cat.button_text ?? '',
      layout_mode: cat.layout_mode ?? 'card',
      columns: cat.columns ?? 3,
      card_style: cat.card_style ?? 'overlay',
    };
    this.saveError.set(null);
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editCategory.set(null);
    this.saveError.set(null);
  }

  save(): void {
    if (!this.form.name.trim()) { this.saveError.set('Name is required.'); return; }
    if (!this.editCategory() && !this.form.slug.trim()) { this.saveError.set('Slug is required.'); return; }

    this.saving.set(true);
    this.saveError.set(null);

    const payload = {
      slug: this.form.slug.trim(),
      name: this.form.name.trim(),
      description: this.form.description.trim() || null,
      visibility: this.form.visibility,
      image_url: this.form.image_url.trim() || null,
      icon_key: this.form.icon_key.trim() || null,
      show_title: this.form.show_title,
      show_description: this.form.show_description,
      show_button: this.form.show_button,
      button_text: this.form.button_text.trim() || null,
      layout_mode: this.form.layout_mode,
      columns: Number(this.form.columns),
      card_style: this.form.card_style,
    };

    const editing = this.editCategory();
    const req = editing
      ? this.categoryService.update(editing.slug, payload)
      : this.categoryService.create(payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.toastr.success(editing ? 'Category updated.' : 'Category created.');
        this.closeModal();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.error || 'Failed to save category.');
      },
    });
  }

  async deleteCategory(cat: Category): Promise<void> {
    const ok = await this.confirmDialog.open({
      title: 'Delete Category',
      message: cat.form_count > 0
        ? `"${cat.name}" still has ${cat.form_count} form(s) assigned. Remove those assignments first before deleting this category.`
        : `Delete category "${cat.name}"? This cannot be undone.`,
      confirmLabel: cat.form_count > 0 ? 'OK' : 'Delete',
      cancelLabel: cat.form_count > 0 ? undefined : 'Cancel',
      variant: cat.form_count > 0 ? 'info' : 'danger',
    });
    if (!ok || cat.form_count > 0) return;

    this.categoryService.delete(cat.slug).subscribe({
      next: () => {
        this.toastr.success(`Category "${cat.name}" deleted.`);
        this.categories.update(list => list.filter(c => c.slug !== cat.slug));
      },
      error: (err) => {
        this.toastr.error(err?.error?.error || 'Failed to delete category.');
      },
    });
  }
}
