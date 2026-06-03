import { Component, OnInit, signal, computed, inject, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CategoryService } from '../../../core/services/category.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { SlidePanelService } from '../../../shared/components/slide-panel/slide-panel.service';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';
import { ToastrService } from 'ngx-toastr';
import { Category } from '../../../core/models';

interface CategoryFormModel {
  slug: string;
  name: string;
  description: string;
  visibility: 'public' | 'restricted';
  image_url: string;
  show_category_image: boolean;
  show_category_title: boolean;
  show_category_description: boolean;
  icon_key: string;
  layout_mode: 'card' | 'list';
  page_size: number;
  show_title: boolean;
  show_description: boolean;
  show_button: boolean;
  button_text: string;
  columns: number;
  card_style: 'overlay' | 'compact';
}

const emptyForm = (): CategoryFormModel => ({
  slug: '',
  name: '',
  description: '',
  visibility: 'public',
  image_url: '',
  show_category_image: true,
  show_category_title: true,
  show_category_description: true,
  icon_key: '',
  layout_mode: 'card',
  page_size: 12,
  show_title: true,
  show_description: true,
  show_button: true,
  button_text: '',
  columns: 3,
  card_style: 'overlay',
});

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HelpTriggerComponent],
  template: `
    <div>
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="flex items-center gap-1 text-2xl font-bold text-gray-900 dark:text-white">
            Categories
            <app-help-trigger helpKey="admin.categories.list" label="Help for categories" />
          </h1>
          <p class="text-sm text-gray-500 mt-0.5">Manage shared form categories and their access settings.</p>
        </div>
        @if (canEdit()) {
          <div class="ta-btn-group">
            <button type="button" (click)="openCreate()" class="ta-btn-group-action">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
              New Category
            </button>
            <app-help-trigger helpKey="admin.categories.create" label="Help for creating a category" [grouped]="true" />
          </div>
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
        <div class="ta-table-shell">
          <table class="ta-table min-w-full">
            <thead class="ta-table-head">
              <tr>
                <th class="ta-table-th">
                  <span class="flex items-center gap-1">Name / Slug <app-help-trigger helpKey="admin.categories.slug" label="Help for category slugs" /></span>
                </th>
                <th class="ta-table-th">
                  <span class="flex items-center gap-1">Visibility <app-help-trigger helpKey="admin.categories.visibility" label="Help for category visibility" /></span>
                </th>
                <th class="ta-table-th">
                  <span class="flex items-center gap-1">Forms <app-help-trigger helpKey="admin.categories.forms" label="Help for assigned forms" /></span>
                </th>
                <th class="ta-table-th">
                  <span class="flex items-center gap-1">Public URL <app-help-trigger helpKey="admin.categories.public-url" label="Help for category public URLs" /></span>
                </th>
                @if (canEdit()) {
                  <th class="ta-table-th">
                    <span class="flex items-center gap-1">Actions <app-help-trigger helpKey="admin.categories.actions" label="Help for category actions" /></span>
                  </th>
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
                  <tr class="ta-table-row">
                    <td class="px-5 py-4">
                      <div class="font-medium text-gray-900 dark:text-white">{{ cat.name }}</div>
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
                            class="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700">
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
          <div class="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-300 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Showing {{ total() === 0 ? 0 : offset() + 1 }}-{{ Math.min(offset() + pageSize, total()) }} of {{ total() }}
            </div>
            <div class="flex items-center gap-2">
              <select [(ngModel)]="pageSize" (ngModelChange)="changePageSize()" class="ta-admin-control px-2 py-1 text-sm">
                <option [value]="10">10</option>
                <option [value]="25">25</option>
                <option [value]="50">50</option>
                <option [value]="100">100</option>
              </select>
              <button type="button" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs" [disabled]="offset() === 0" (click)="previousPage()">Previous</button>
              <span class="text-xs">Page {{ currentPage() }} of {{ totalPages() }}</span>
              <button type="button" class="ta-btn ta-btn-secondary px-3 py-1.5 text-xs" [disabled]="offset() + pageSize >= total()" (click)="nextPage()">Next</button>
            </div>
          </div>
        </div>
      }
    </div>

    <!-- Slide panel content template -->
    <ng-template #categoryFormTpl>
      @if (saveError()) {
        <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ saveError() }}</div>
      }

      <div class="space-y-5">

        <!-- ── Basic ── -->
        <div>
          <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            Slug <span class="text-red-500">*</span>
            <app-help-trigger helpKey="admin.categories.slug" label="Help for category slug" />
          </label>
          <input type="text" [(ngModel)]="form.slug" placeholder="pre-start"
            [disabled]="!!editCategory()"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400 font-mono"/>
          <p class="mt-1 text-xs text-gray-400">URL: <code>/category/{{ form.slug || 'slug' }}</code>. Cannot change after creation.</p>
        </div>

        <div>
          <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            Name <span class="text-red-500">*</span>
            <app-help-trigger helpKey="admin.categories.name" label="Help for category name" />
          </label>
          <input type="text" [(ngModel)]="form.name" placeholder="Pre-Start Checks"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        </div>

        <div>
          <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            Description
            <app-help-trigger helpKey="admin.categories.description" label="Help for category description" />
          </label>
          <textarea [(ngModel)]="form.description" rows="2" placeholder="Optional category metadata"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
        </div>

        <!-- ── Visibility ── -->
        <div class="border-t pt-4">
          <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            Visibility
            <app-help-trigger helpKey="admin.categories.visibility" label="Help for category visibility" />
          </label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="cat_visibility" [checked]="form.visibility === 'public'" (change)="setVisibility('public')"
                class="h-4 w-4 border-gray-300 text-indigo-600"/>
              <span class="text-sm text-gray-700"><strong>Public</strong> <span class="text-gray-400 font-normal">— anyone</span></span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="cat_visibility" [checked]="form.visibility === 'restricted'" (change)="setVisibility('restricted')"
                class="h-4 w-4 border-gray-300 text-indigo-600"/>
              <span class="text-sm text-gray-700"><strong>Restricted</strong> <span class="text-gray-400 font-normal">— login required</span></span>
            </label>
          </div>
          @if (form.visibility === 'restricted') {
            <p class="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
              Access controlled by the allowed roles and users set on each form.
            </p>
          }
        </div>

        <!-- ── Category Image / Icon ── -->
        <div class="border-t pt-4 space-y-3">
          <p class="flex items-center gap-1 text-sm font-medium text-gray-700">
            Category image / icon
            <app-help-trigger helpKey="admin.categories.image-icon" label="Help for category image and icon" />
          </p>
          <p class="text-xs text-gray-400 -mt-2">Stored category-level metadata. Each form's own card image is set on the form itself.</p>

          <div>
            <label class="flex items-center gap-1 text-xs font-medium text-gray-600 mb-1">
              Image URL
              <app-help-trigger helpKey="admin.categories.image-icon" label="Help for category image URL" />
            </label>
            <input type="url" [(ngModel)]="form.image_url" placeholder="https://…"
              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            @if (form.image_url) {
              <img [src]="form.image_url" alt="Preview" class="mt-2 h-16 rounded-lg object-cover border border-gray-200"/>
            }
          </div>

          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" [(ngModel)]="form.show_category_image"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
            <span class="flex items-center gap-1 text-sm text-gray-700">
              Enable category image / icon display metadata
              <app-help-trigger helpKey="admin.categories.image-icon" label="Help for showing category image and icon" />
            </span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" [(ngModel)]="form.show_category_title"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
            <span class="text-sm text-gray-700">Show category name in the public page header</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" [(ngModel)]="form.show_category_description"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
            <span class="text-sm text-gray-700">Show category description in the public page header</span>
          </label>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">
              Icon key <span class="text-gray-400 font-normal">(fallback metadata)</span>
            </label>
            <div class="ta-input-group w-full">
              <input type="text" [(ngModel)]="form.icon_key" placeholder="fa:FaTruck"
                class="ta-input-group-field px-3 py-2 font-mono"/>
              <app-help-trigger helpKey="admin.categories.image-icon" label="Help for category icon key" [inputGrouped]="true" />
            </div>
          </div>
        </div>

        <!-- ── Layout ── -->
        <div class="border-t pt-4">
          <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            Layout
            <app-help-trigger helpKey="admin.categories.layout" label="Help for category layout" />
          </label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="cat_layout_mode" [checked]="form.layout_mode === 'card'" (change)="setLayoutMode('card')"
                class="h-4 w-4 border-gray-300 text-indigo-600"/>
              <span class="text-sm text-gray-700"><strong>Card view</strong></span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="cat_layout_mode" [checked]="form.layout_mode === 'list'" (change)="setLayoutMode('list')"
                class="h-4 w-4 border-gray-300 text-indigo-600"/>
              <span class="text-sm text-gray-700"><strong>List view</strong></span>
            </label>
          </div>
        </div>

        <!-- ── Pagination ── -->
        <div>
          <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
            Items per page <span class="text-gray-400 font-normal text-xs">({{ form.page_size }})</span>
            <app-help-trigger helpKey="admin.categories.page-size" label="Help for items per page" />
          </label>
          <input type="range" [(ngModel)]="form.page_size" min="4" max="48" step="4"
            class="w-full max-w-xs accent-indigo-600"/>
          <div class="flex justify-between text-xs text-gray-400 max-w-xs mt-0.5">
            <span>4</span><span>12</span><span>24</span><span>48</span>
          </div>
        </div>

        <!-- ── Card view settings ── -->
        @if (form.layout_mode === 'card') {
          <div class="border-t pt-4 space-y-3">
            <p class="flex items-center gap-1 text-sm font-medium text-gray-700">
              Card display
              <app-help-trigger helpKey="admin.categories.card-display" label="Help for card display" />
            </p>

            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" [(ngModel)]="form.show_title"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
              <span class="flex items-center gap-1 text-sm text-gray-700">
                Show form title on card
                <app-help-trigger helpKey="admin.categories.card-display" label="Help for showing form titles on cards" />
              </span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" [(ngModel)]="form.show_description"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
              <span class="flex items-center gap-1 text-sm text-gray-700">
                Show description on card
                <app-help-trigger helpKey="admin.categories.card-display" label="Help for showing descriptions on cards" />
              </span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" [(ngModel)]="form.show_button"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
              <span class="flex items-center gap-1 text-sm text-gray-700">
                Show button
                <app-help-trigger helpKey="admin.categories.card-display" label="Help for showing buttons on cards" />
              </span>
            </label>
            @if (form.show_button) {
              <div class="pl-6">
                <label class="block text-xs font-medium text-gray-600 mb-1">Button label</label>
                <div class="ta-input-group w-full max-w-xs">
                  <input type="text" [(ngModel)]="form.button_text" placeholder="Start"
                    class="ta-input-group-field px-3 py-2"/>
                  <app-help-trigger helpKey="admin.categories.button-label" label="Help for card button label" [inputGrouped]="true" />
                </div>
              </div>
            }

            <div class="pt-1">
              <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                Columns <span class="text-gray-400 font-normal text-xs">({{ form.columns }})</span>
                <app-help-trigger helpKey="admin.categories.columns" label="Help for card columns" />
              </label>
              <input type="range" [(ngModel)]="form.columns" min="1" max="4" step="1"
                class="w-full max-w-xs accent-indigo-600"/>
              <div class="flex justify-between text-xs text-gray-400 max-w-xs mt-0.5">
                <span>1</span><span>2</span><span>3</span><span>4</span>
              </div>
            </div>

            <div>
              <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                Card style
                <app-help-trigger helpKey="admin.categories.card-style" label="Help for card style" />
              </label>
              <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="cat_card_style" [checked]="form.card_style === 'overlay'" (change)="setCardStyle('overlay')"
                    class="h-4 w-4 border-gray-300 text-indigo-600"/>
                  <span class="text-sm text-gray-700"><strong>Overlay</strong> <span class="text-gray-400 font-normal">— hover to reveal</span></span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="cat_card_style" [checked]="form.card_style === 'compact'" (change)="setCardStyle('compact')"
                    class="h-4 w-4 border-gray-300 text-indigo-600"/>
                  <span class="text-sm text-gray-700"><strong>Compact</strong> <span class="text-gray-400 font-normal">— always visible</span></span>
                </label>
              </div>
            </div>
          </div>
        }
      </div>

      <!-- Footer actions -->
      <div class="mt-8 flex items-center justify-end gap-3 border-t pt-5">
        <button type="button" (click)="closePanel()"
          class="ta-btn ta-btn-secondary">
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
    </ng-template>
  `,
})
export class CategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private confirmDialog = inject(ConfirmDialogService);
  private slidePanel = inject(SlidePanelService);
  private toastr = inject(ToastrService);

  @ViewChild('categoryFormTpl') categoryFormTpl!: TemplateRef<unknown>;

  categories = signal<Category[]>([]);
  total = signal(0);
  offset = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);
  editCategory = signal<Category | null>(null);

  isAdmin = computed(() => this.authService.currentUser()?.role === 'admin');
  canEdit = computed(() => ['admin', 'editor'].includes(this.authService.currentUser()?.role ?? ''));
  pageSize = 25;
  readonly Math = Math;
  currentPage = computed(() => Math.floor(this.offset() / this.pageSize) + 1);
  totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize)));

  form: CategoryFormModel = emptyForm();

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.categoryService.listPaged({ limit: this.pageSize, offset: this.offset() }).subscribe({
      next: (result) => {
        this.categories.set(result.items);
        this.total.set(result.total ?? 0);
        this.loading.set(false);
      },
      error: (err) => { this.loading.set(false); this.error.set(err?.error?.error || 'Failed to load categories.'); },
    });
  }

  changePageSize(): void {
    this.pageSize = Number(this.pageSize);
    this.offset.set(0);
    this.load();
  }

  nextPage(): void {
    if (this.offset() + this.pageSize >= this.total()) return;
    this.offset.update(v => v + this.pageSize);
    this.load();
  }

  previousPage(): void {
    this.offset.update(v => Math.max(0, v - this.pageSize));
    this.load();
  }

  openCreate(): void {
    this.editCategory.set(null);
    this.form = emptyForm();
    this.saveError.set(null);
    this.slidePanel.open(this.categoryFormTpl, { title: 'New Category' });
  }

  openEdit(cat: Category): void {
    this.editCategory.set(cat);
    this.form = {
      slug: cat.slug,
      name: cat.name,
      description: cat.description ?? '',
      visibility: cat.visibility,
      image_url: cat.image_url ?? '',
      show_category_image: cat.show_category_image ?? true,
      show_category_title: cat.show_category_title ?? true,
      show_category_description: cat.show_category_description ?? true,
      icon_key: cat.icon_key ?? '',
      layout_mode: cat.layout_mode ?? 'card',
      page_size: cat.page_size ?? 12,
      show_title: cat.show_title,
      show_description: cat.show_description,
      show_button: cat.show_button,
      button_text: cat.button_text ?? '',
      columns: cat.columns ?? 3,
      card_style: cat.card_style ?? 'overlay',
    };
    this.saveError.set(null);
    this.slidePanel.open(this.categoryFormTpl, {
      title: 'Edit Category',
      subtitle: cat.name,
    });
  }

  closePanel(): void {
    this.slidePanel.close();
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
      show_category_image: this.form.show_category_image,
      show_category_title: this.form.show_category_title,
      show_category_description: this.form.show_category_description,
      icon_key: this.form.icon_key.trim() || null,
      layout_mode: this.form.layout_mode,
      page_size: Number(this.form.page_size),
      show_title: this.form.show_title,
      show_description: this.form.show_description,
      show_button: this.form.show_button,
      button_text: this.form.button_text.trim() || null,
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
        this.closePanel();
        this.load();
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err?.error?.error || 'Failed to save category.');
      },
    });
  }

  setVisibility(v: 'public' | 'restricted'): void { this.form = { ...this.form, visibility: v }; }
  setLayoutMode(m: 'card' | 'list'): void { this.form = { ...this.form, layout_mode: m }; }
  setCardStyle(s: 'overlay' | 'compact'): void { this.form = { ...this.form, card_style: s }; }

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
        if (this.categories().length === 1 && this.offset() > 0) {
          this.offset.update(v => Math.max(0, v - this.pageSize));
        }
        this.load();
      },
      error: (err) => {
        this.toastr.error(err?.error?.error || 'Failed to delete category.');
      },
    });
  }
}
