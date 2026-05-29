import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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
  imageFullWidth: boolean;
  iconPack: string | null;
  iconName: string | null;
  iconSvgUrl: string | null;
  questions: number;
  showTitle: boolean;
  showDescription: boolean;
  buttonText: string;
}

@Component({
  selector: 'app-pre-start-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FormCardComponent],
  template: `
    <div class="min-h-screen flex flex-col relative overflow-hidden" style="background-color: #f0f4f8;">

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
                  class="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition">
                  Sign in to continue
                </a>
              </div>
            </div>
          } @else if (cards().length === 0) {
            <div class="text-center py-24 text-gray-400 text-lg">No forms available in this category.</div>
          } @else {
            <div class="flex flex-wrap justify-center gap-6">
              @for (card of cards(); track card.id) {
                <a [routerLink]="['/form-public', card.id]" class="block w-96">
                  <app-form-card
                    [name]="card.name"
                    [description]="card.description"
                    [imageUrl]="card.imageUrl"
                    [iconSvgUrl]="card.iconSvgUrl"
                    [showTitle]="card.showTitle"
                    [showDescription]="card.showDescription"
                    [buttonText]="card.buttonText"
                  />
                </a>
              }
            </div>
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
  private router = inject(Router);

  forms = signal<Form[]>([]);
  categoryEntity = signal<Category | null>(null);
  loading = signal(true);
  restricted = signal(false);
  siteSettings = signal<SiteSettings | null>(null);
  categorySlug = signal('');

  logoSrc = computed(() => {
    const s = this.siteSettings();
    return s?.logoExpandedLightUrl?.trim() || '/images/logo/logo.svg';
  });

  siteName = computed(() => this.siteSettings()?.siteName?.trim() || 'SurveyFlow');

  categoryTitle = computed(() => {
    const cat = this.categoryEntity();
    if (cat?.name) return cat.name;
    return this.categorySlug().replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  });

  cards = computed<CategoryCard[]>(() => {
    const cat = this.categoryEntity();

    // Category-level display settings (shared across all cards in this category)
    const catShowTitle: boolean = cat?.show_title ?? true;
    const catShowDescription: boolean = cat?.show_description ?? true;
    const catButtonText: string = cat?.button_text?.trim() || 'Start';

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
        imageFullWidth: !!(appSettings.categoryImageFullWidth ?? appSettings.preStartImageFullWidth),
        iconPack: null,
        iconName: null,
        iconSvgUrl,
        questions: this.countQuestions(schema),
        showTitle: catShowTitle,
        showDescription: catShowDescription,
        buttonText: catButtonText,
      };
    });
  });

  ngOnInit(): void {
    this.settingsService.getSiteSettings().subscribe({ next: s => this.siteSettings.set(s), error: () => {} });
    this.route.paramMap.subscribe(params => {
      const slug = params.get('categorySlug')?.trim() || '';
      this.categorySlug.set(slug);
      this.loading.set(true);
      this.restricted.set(false);
      this.categoryEntity.set(null);
      // Load category metadata (non-blocking — pre-start page still renders without it)
      this.categoryService.get(slug).subscribe({
        next: (cat) => this.categoryEntity.set(cat),
        error: () => {},
      });
      this.formService.list(undefined, slug, true).subscribe({
        next: forms => {
          this.forms.set(forms);
          this.loading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 401) {
            this.restricted.set(true);
          }
        },
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
