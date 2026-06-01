import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FormService } from '../../core/services/form.service';
import { SettingsService } from '../../core/services/settings.service';
import { CategoryService } from '../../core/services/category.service';
import { AuthService } from '../../core/services/auth.service';
import { IconService } from '../../core/services/icon.service';
import { Category, Form, SiteSettings } from '../../core/models';
import { FormCardComponent } from '../../shared/components/form-card/form-card.component';

interface CategoryCard {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  iconSvgUrl: string | null;
  showTitle: boolean;
  showDescription: boolean;
  showButton: boolean;
  buttonText: string;
  cardStyle: 'overlay' | 'compact';
}

@Component({
  selector: 'app-pre-start-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormCardComponent],
  template: `
    <div class="min-h-screen flex flex-col relative overflow-hidden bg-[#f0f4f8] dark:bg-gray-900">

      <!-- Dot mesh patches — scattered -->
      <svg class="pointer-events-none absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" style="opacity:1;">
        <defs>
          <pattern id="dm" x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#4a7fa5"/>
          </pattern>
        </defs>
        <!-- patch 1: upper-left area -->
        <rect x="60" y="80" width="140" height="100" rx="4" fill="url(#dm)" opacity="0.14"/>
        <!-- patch 2: mid-right -->
        <rect x="78%" y="35%" width="110" height="80" rx="4" fill="url(#dm)" opacity="0.11"/>
        <!-- patch 3: lower-center-left -->
        <rect x="22%" y="68%" width="90" height="70" rx="4" fill="url(#dm)" opacity="0.10"/>
        <!-- patch 4: upper-right -->
        <rect x="82%" y="8%" width="120" height="90" rx="4" fill="url(#dm)" opacity="0.12"/>
        <!-- patch 5: lower-left -->
        <rect x="4%" y="78%" width="100" height="75" rx="4" fill="url(#dm)" opacity="0.09"/>
      </svg>

      <!-- Decorative circles — bottom-right -->
      <svg class="pointer-events-none absolute" xmlns="http://www.w3.org/2000/svg"
           style="bottom:-60px;right:-120px;width:700px;height:700px;overflow:visible;">
        <circle cx="500" cy="580" r="390" fill="#4a7fa5" opacity="0.02"/>
        <circle cx="460" cy="520" r="255" fill="#4a7fa5" opacity="0.035"/>
      </svg>

      <!-- Decorative circles — top-left -->
      <svg class="pointer-events-none absolute" xmlns="http://www.w3.org/2000/svg"
           style="top:-40px;left:-90px;width:620px;height:620px;overflow:visible;">
        <circle cx="80" cy="60" r="330" fill="#4a7fa5" opacity="0.02"/>
        <circle cx="140" cy="110" r="200" fill="#4a7fa5" opacity="0.035"/>
      </svg>

      <!-- Logo only -->
      <header class="px-6 py-5">
        <a href="/" class="inline-flex items-center">
          <img [src]="logoSrc()" [alt]="siteName()" class="h-8 object-contain" />
        </a>
      </header>

      <!-- Cards — boxed, centered vertically and horizontally -->
      <main class="flex-1 flex items-center justify-center px-6 py-10">
        <div class="w-full max-w-[1200px]">
          @if (loading()) {
            <div class="flex justify-center items-center py-24">
              <div class="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          } @else if (restricted()) {
            <div class="flex items-center justify-center py-24">
              <div class="text-center max-w-sm">
                <div class="mb-4 flex justify-center">
                  <div class="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                    <svg class="h-8 w-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                  </div>
                </div>
                <h2 class="text-xl font-bold text-gray-900 mb-2">Restricted Access</h2>
                <p class="text-sm text-gray-500 mb-6">
                  This category requires you to be logged in to view its contents.
                </p>
                <a [routerLink]="['/login']"
                  class="ta-btn ta-btn-primary px-5 py-2.5">
                  Sign in to continue
                </a>
              </div>
            </div>
          } @else if (cards().length === 0) {
            <div class="text-center py-24 text-gray-400 text-lg">No forms available in this category.</div>

          } @else {
            @if (showCategoryHeader()) {
              <section class="mb-8 flex flex-col items-center text-center">
                @if (categoryHeaderImageUrl()) {
                  <img [src]="categoryHeaderImageUrl()" [alt]="categoryTitle()"
                    class="mb-4 h-24 w-24 rounded-2xl border border-gray-200 bg-white object-cover shadow-sm dark:border-gray-700 dark:bg-gray-800" />
                } @else if (categoryHeaderIconUrl()) {
                  <div class="mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <img [src]="categoryHeaderIconUrl()" [alt]="categoryTitle()" class="h-14 w-14 object-contain" />
                  </div>
                }
                @if (categoryEntity()?.show_category_title !== false) {
                  <h1 class="text-3xl font-bold text-gray-900 dark:text-white">{{ categoryTitle() }}</h1>
                }
                @if (categoryEntity()?.show_category_description !== false && categoryEntity()?.description) {
                  <p class="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {{ categoryEntity()?.description }}
                  </p>
                }
              </section>
            }

            @if (layoutMode() === 'list') {
            <!-- ── List view — titles only ── -->
            <div class="flex flex-col divide-y divide-gray-100 max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              @for (card of pagedCards(); track card.id) {
                <a [routerLink]="['/form-public', card.id]"
                  class="flex items-center justify-between px-5 py-3.5 hover:bg-blue-50 dark:hover:bg-gray-700 transition group">
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition">{{ card.name }}</span>
                  <svg class="w-4 h-4 text-gray-400 group-hover:text-blue-600 shrink-0 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                </a>
              }
            </div>

            } @else {
            <!-- ── Card view ── -->
            <div class="grid gap-6" [class]="gridColsClass()">
              @for (card of pagedCards(); track card.id) {
                <a [routerLink]="['/form-public', card.id]" class="block">
                  <app-form-card
                    [name]="card.name"
                    [description]="card.description"
                    [imageUrl]="card.imageUrl"
                    [iconSvgUrl]="card.iconSvgUrl"
                    [showTitle]="card.showTitle"
                    [showDescription]="card.showDescription"
                    [showButton]="card.showButton"
                    [buttonText]="card.buttonText"
                    [cardStyle]="card.cardStyle"
                  />
                </a>
              }
            </div>
            }
          }

          <!-- ── Pagination ── -->
          @if (totalPages() > 1) {
            <div class="mt-8 flex items-center justify-center gap-2">
              <button type="button" (click)="goToPage(currentPage() - 1)" [disabled]="currentPage() === 1"
                class="ta-btn ta-btn-secondary disabled:opacity-40">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Previous
              </button>

              @for (p of pageNumbers(); track p) {
                @if (p === -1) {
                  <span class="px-2 text-gray-400 select-none">…</span>
                } @else {
                  <button type="button" (click)="goToPage(p)"
                    class="inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-medium transition"
                    [class.bg-blue-600]="p === currentPage()"
                    [class.text-white]="p === currentPage()"
                    [class.border]="p !== currentPage()"
                    [class.border-gray-300]="p !== currentPage()"
                    [class.bg-white]="p !== currentPage()"
                    [class.text-gray-700]="p !== currentPage()"
                    [class.hover:bg-gray-50]="p !== currentPage()"
                    [class.dark:bg-gray-800]="p !== currentPage()"
                    [class.dark:border-gray-600]="p !== currentPage()"
                    [class.dark:text-gray-200]="p !== currentPage()"
                    [class.dark:hover:bg-gray-700]="p !== currentPage()">
                    {{ p }}
                  </button>
                }
              }

              <button type="button" (click)="goToPage(currentPage() + 1)" [disabled]="currentPage() === totalPages()"
                class="ta-btn ta-btn-secondary disabled:opacity-40">
                Next
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
            <p class="mt-3 text-center text-xs text-gray-400">
              Page {{ currentPage() }} of {{ totalPages() }} · {{ cards().length }} forms
            </p>
          }
        </div>
      </main>
    </div>
  `,
})
export class PreStartPageComponent implements OnInit {
  private formService = inject(FormService);
  private settingsService = inject(SettingsService);
  private categoryService = inject(CategoryService);
  private authService = inject(AuthService);
  private iconService = inject(IconService);
  private route = inject(ActivatedRoute);

  forms = signal<Form[]>([]);
  categoryEntity = signal<Category | null>(null);
  loading = signal(true);
  restricted = signal(false);
  siteSettings = signal<SiteSettings | null>(null);
  categorySlug = signal('');
  currentPage = signal(1);

  logoSrc = computed(() => {
    const s = this.siteSettings();
    return s?.logoExpandedLightUrl?.trim() || '/images/logo/logo.svg';
  });

  siteName = computed(() => this.siteSettings()?.siteName?.trim() || 'SurveyFlow');

  layoutMode = computed(() => this.categoryEntity()?.layout_mode ?? 'card');

  gridColsClass = computed(() => {
    const cols = this.categoryEntity()?.columns ?? 3;
    return { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' }[cols] ?? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
  });

  categoryTitle = computed(() => {
    const cat = this.categoryEntity();
    if (cat?.name) return cat.name;
    return this.categorySlug().replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  });

  showCategoryHeader = computed(() => {
    const cat = this.categoryEntity();
    return !!cat && (
      (cat.show_category_image && !!(cat.image_url || cat.icon_key))
      || cat.show_category_title !== false
      || (cat.show_category_description !== false && !!cat.description)
    );
  });

  categoryHeaderImageUrl = computed(() => {
    const cat = this.categoryEntity();
    return cat?.show_category_image ? cat.image_url?.trim() || null : null;
  });

  categoryHeaderIconUrl = computed(() => {
    const cat = this.categoryEntity();
    const iconKey = cat?.show_category_image ? cat.icon_key?.trim() : null;
    if (!iconKey?.includes(':')) return null;
    const [pack, name] = iconKey.split(':', 2);
    return this.iconService.getSvgUrl(pack, name);
  });

  cards = computed<CategoryCard[]>(() => {
    const cat = this.categoryEntity();

    // Category-level display settings (shared across all cards in this category)
    const catShowTitle: boolean = cat?.show_title ?? true;
    const catShowDescription: boolean = cat?.show_description ?? true;
    const catShowButton: boolean = cat?.show_button ?? true;
    const catButtonText: string = cat?.button_text?.trim() || 'Start';
    const catCardStyle: 'overlay' | 'compact' = cat?.card_style === 'compact' ? 'compact' : 'overlay';

    return this.forms().map(f => {
      const schema = this.parseJson(f.json);
      const appSettings = schema?.appSettings ?? {};

      // Card image and icon are per-form — each form in a category can have its own
      const imageUrl: string | null = appSettings.categoryImage || appSettings.preStartImage || null;
      const iconKey: string | null = appSettings.categoryIcon || appSettings.preStartIcon || appSettings.formsListIconKey || null;

      let iconSvgUrl: string | null = null;
      if (!imageUrl && iconKey && iconKey.includes(':')) {
        const [pack, name] = iconKey.split(':', 2);
        iconSvgUrl = this.iconService.getSvgUrl(pack, name);
      }

      return {
        id: f.id,
        name: f.name,
        description: appSettings.publicDescription || null,
        imageUrl,
        iconSvgUrl,
        showTitle: catShowTitle,
        showDescription: catShowDescription,
        showButton: catShowButton,
        buttonText: catButtonText,
        cardStyle: catCardStyle,
      };
    });
  });

  pageSize = computed(() => this.categoryEntity()?.page_size ?? 12);

  totalPages = computed(() => Math.max(1, Math.ceil(this.cards().length / this.pageSize())));

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: number[] = [1];
    if (current > 3) pages.push(-1);
    for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
    if (current < total - 2) pages.push(-1);
    pages.push(total);
    return pages;
  });

  pagedCards = computed(() => {
    const size = this.pageSize();
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * size;
    return this.cards().slice(start, start + size);
  });

  goToPage(page: number): void {
    this.currentPage.set(Math.max(1, Math.min(page, this.totalPages())));
  }

  ngOnInit(): void {
    this.settingsService.getSiteSettings().subscribe({ next: s => this.siteSettings.set(s), error: () => {} });
    this.route.paramMap.subscribe(params => {
      const slug = params.get('categorySlug')?.trim() || '';
      this.categorySlug.set(slug);
      this.loading.set(true);
      this.restricted.set(false);
      this.categoryEntity.set(null);
      this.currentPage.set(1);

      forkJoin({
        category: this.categoryService.get(slug).pipe(catchError(() => of(null))),
        forms: this.formService.list(undefined, slug, true).pipe(
          catchError((err: HttpErrorResponse) => {
            if (err.status === 401) this.restricted.set(true);
            return of([] as Form[]);
          })
        ),
      }).subscribe(({ category, forms }) => {
        this.categoryEntity.set(category);
        this.forms.set(forms);
        this.loading.set(false);
      });
    });
  }

  private parseJson(json: any): any {
    if (typeof json === 'string') {
      try { return JSON.parse(json); } catch { return null; }
    }
    return json;
  }

  private countQuestions(schema: any): number {
    if (!schema) return 0;
    const components: any[] = schema.components || [];
    return components.filter((c: any) => c.type !== 'button').length;
  }
}
