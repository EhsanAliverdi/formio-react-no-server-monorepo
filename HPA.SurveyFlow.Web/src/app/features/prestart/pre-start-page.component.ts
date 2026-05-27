import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormService } from '../../core/services/form.service';
import { SettingsService } from '../../core/services/settings.service';
import { IconService } from '../../core/services/icon.service';
import { Form, SiteSettings } from '../../core/models';

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
  imports: [CommonModule, RouterLink],
  styles: [`
    .card-root {
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
    }
    .card-root:hover {
      transform: translateY(-6px) scale(1.02);
      box-shadow: 0 24px 48px -8px rgba(0,0,0,0.22), 0 8px 20px -4px rgba(0,0,0,0.10);
    }
    .card-img {
      transition: transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94);
    }
    .card-root:hover .card-img {
      transform: scale(1.08);
    }
    .card-overlay {
      transition: opacity 0.35s ease;
      opacity: 0;
    }
    .card-root:hover .card-overlay {
      opacity: 1;
    }
    .card-content {
      transition: transform 0.35s cubic-bezier(0.34,1.2,0.64,1), opacity 0.3s ease;
      transform: translateY(12px);
      opacity: 0;
    }
    .card-root:hover .card-content {
      transform: translateY(0);
      opacity: 1;
    }
    .card-btn {
      transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    }
    .card-btn:hover {
      transform: scale(1.03);
      box-shadow: 0 4px 16px rgba(37,99,235,0.45);
    }
    .card-btn:active {
      transform: scale(0.97);
    }
  `],
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
          } @else if (cards().length === 0) {
            <div class="text-center py-24 text-gray-400 text-lg">No forms available in this category.</div>
          } @else {
            <div class="flex flex-wrap justify-center gap-6">
              @for (card of cards(); track card.id) {

                <!-- Hero card: image fills entire card, overlay appears on hover -->
                <a [routerLink]="['/form-public', card.id]"
                   class="card-root relative block w-96 rounded-2xl overflow-hidden shadow-md cursor-pointer select-none"
                   style="aspect-ratio: 4/3;">

                  <!-- Background image or fallback -->
                  @if (card.imageUrl) {
                    <img [src]="card.imageUrl" [alt]="card.name"
                      class="card-img absolute inset-0 w-full h-full object-contain bg-white" />
                  } @else if (card.iconSvgUrl) {
                    <div class="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <img [src]="card.iconSvgUrl" [alt]="card.iconName || card.name"
                        class="card-img w-28 h-28 object-contain" />
                    </div>
                  } @else {
                    <div class="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <svg class="card-img w-20 h-20 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  }

                  <!-- Hover overlay: deeper gradient + title + description + button at bottom -->
                  <div class="card-overlay absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 flex flex-col justify-between p-5 pointer-events-none">
                    @if (card.showTitle) {
                      <div class="card-content pointer-events-none text-white font-bold text-lg leading-tight tracking-tight drop-shadow">{{ card.name }}</div>
                    }
                    <div class="card-content pointer-events-auto mt-auto">
                      @if (card.showDescription && card.description) {
                        <p class="text-white/80 text-sm leading-relaxed mb-4 drop-shadow">{{ card.description }}</p>
                      }
                      <span class="card-btn inline-flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5">
                        {{ card.buttonText }}
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>


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
  private iconService = inject(IconService);
  private route = inject(ActivatedRoute);

  forms = signal<Form[]>([]);
  loading = signal(true);
  siteSettings = signal<SiteSettings | null>(null);
  categorySlug = signal('');

  logoSrc = computed(() => {
    const s = this.siteSettings();
    return s?.logoExpandedLightUrl?.trim() || '/images/logo/logo.svg';
  });

  siteName = computed(() => this.siteSettings()?.siteName?.trim() || 'SurveyFlow');

  categoryTitle = computed(() => {
    const first = this.forms()[0];
    const appSettings = first ? this.parseJson(first.json)?.appSettings ?? {} : {};
    return appSettings.categoryName?.trim() || this.categorySlug().replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  });

  cards = computed<CategoryCard[]>(() =>
    this.forms().map(f => {
      const schema = this.parseJson(f.json);
      const appSettings = schema?.appSettings ?? {};

      const imageUrl: string | null = appSettings.categoryImage || appSettings.preStartImage || null;

      let iconPack: string | null = null;
      let iconName: string | null = null;
      let iconSvgUrl: string | null = null;

      const iconKey: string | null = appSettings.categoryIcon || appSettings.preStartIcon || appSettings.formsListIconKey || null;
      if (!imageUrl && iconKey && iconKey.includes(':')) {
        [iconPack, iconName] = iconKey.split(':', 2);
        iconSvgUrl = this.iconService.getSvgUrl(iconPack, iconName);
      }

      return {
        id: f.id,
        name: f.name,
        description: appSettings.publicDescription || null,
        imageUrl,
        imageFullWidth: !!(appSettings.categoryImageFullWidth ?? appSettings.preStartImageFullWidth),
        iconPack,
        iconName,
        iconSvgUrl,
        questions: this.countQuestions(schema),
        showTitle: appSettings.categoryShowTitle !== false,
        showDescription: appSettings.categoryShowDescription !== false,
        buttonText: appSettings.categoryButtonText?.trim() || appSettings.preStartButtonText?.trim() || 'Start',
      };
    })
  );

  ngOnInit(): void {
    this.settingsService.getSiteSettings().subscribe({ next: s => this.siteSettings.set(s), error: () => {} });
    this.route.paramMap.subscribe(params => {
      const slug = params.get('categorySlug')?.trim() || '';
      this.categorySlug.set(slug);
      this.loading.set(true);
      this.formService.list(undefined, slug).subscribe({
        next: forms => {
          this.forms.set(forms);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
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
