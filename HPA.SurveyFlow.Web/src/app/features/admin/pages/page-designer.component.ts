import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { PageService } from '../../../core/services/page.service';
import { Page, SavePageRequest } from '../../../core/models';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-page-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="flex min-h-[calc(100vh-8rem)] flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ pageId() ? 'Design Page' : 'New Page' }}</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Use the visual builder to compose content and external URL embeds.</p>
        </div>
        <div class="flex flex-wrap gap-2">
          @if (pageId()) {
            <a [routerLink]="['/page', form.slug]" target="_blank" class="ta-btn ta-btn-secondary">View</a>
          }
          <a routerLink="/admin/pages" class="ta-btn ta-btn-secondary">Back</a>
          <button type="button" class="ta-btn ta-btn-primary" [disabled]="saving()" (click)="save()">
            {{ saving() ? 'Saving...' : 'Save Page' }}
          </button>
        </div>
      </div>

      @if (error()) { <div class="ta-alert-error">{{ error() }}</div> }

      <section class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 dark:border-gray-700">
          <div>
            <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Page Settings</h2>
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Metadata, access, and rendering mode for the public URL.</p>
          </div>
          <p class="rounded-lg bg-gray-50 px-3 py-2 font-mono text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">/page/{{ form.slug || 'slug' }}</p>
        </div>

        <div class="grid gap-4 xl:grid-cols-[minmax(220px,1fr)_minmax(190px,0.75fr)_160px_170px_190px]">
          <label class="block min-w-0">
            <span class="page-field-label">Title</span>
            <input class="page-field-input" [(ngModel)]="form.title" (ngModelChange)="syncSlug()" />
          </label>
          <label class="block min-w-0">
            <span class="page-field-label">Slug</span>
            <input class="page-field-input font-mono" [(ngModel)]="form.slug" (ngModelChange)="slugEdited = true" />
          </label>
          <label class="block min-w-0">
            <span class="page-field-label">Access</span>
            <select class="page-field-input" [(ngModel)]="form.visibility">
              <option value="public">Public</option>
              <option value="restricted">Restricted</option>
            </select>
          </label>
          <div class="min-w-0">
            <span class="page-field-label">Status</span>
            <label class="page-toggle-field">
              <input type="checkbox" class="h-4 w-4 rounded border-gray-300 text-brand-500" [(ngModel)]="form.is_active" />
              Active
            </label>
          </div>
          <div class="min-w-0">
            <span class="page-field-label">Rendering</span>
            <label class="page-toggle-field">
              <input type="checkbox" class="h-4 w-4 rounded border-gray-300 text-brand-500" [(ngModel)]="form.use_layout" />
              Use layout
            </label>
          </div>
          <label class="block min-w-0 xl:col-span-5">
            <span class="page-field-label">Description</span>
            <textarea class="page-field-input min-h-20 resize-y" [(ngModel)]="form.description"></textarea>
          </label>
        </div>
      </section>

      <section class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        @if (loading()) {
          <div class="flex h-[760px] items-center justify-center text-sm text-gray-400">Loading builder...</div>
        }
        <div #builderHost class="page-builder-host" [class.hidden]="loading()"></div>
      </section>
    </div>
  `,
  styles: [`
    .page-builder-host { height: 760px; }
    .page-field-label { display: block; margin-bottom: 0.375rem; font-size: 0.75rem; font-weight: 600; line-height: 1rem; color: #475569; }
    .page-field-input { display: block; width: 100%; min-height: 2.5rem; border-radius: 0.5rem; border: 1px solid #d1d5db; background: #fff; padding: 0.5rem 0.75rem; font-size: 0.875rem; line-height: 1.25rem; color: #111827; outline: none; transition: border-color .15s ease, box-shadow .15s ease; }
    .page-field-input:focus { border-color: #465fff; box-shadow: 0 0 0 3px rgba(70, 95, 255, 0.16); }
    .page-toggle-field { display: flex; min-height: 2.5rem; width: 100%; align-items: center; gap: 0.75rem; border-radius: 0.5rem; border: 1px solid #d1d5db; background: #fff; padding: 0.5rem 0.75rem; font-size: 0.875rem; line-height: 1.25rem; color: #374151; }
    :host-context(.dark) .page-field-label { color: #d1d5db; }
    :host-context(.dark) .page-field-input { border-color: #4b5563; background: #111827; color: #fff; }
    :host-context(.dark) .page-toggle-field { border-color: #4b5563; background: #111827; color: #d1d5db; }
    :host ::ng-deep .gjs { border: 0; font-family: inherit; }
    :host ::ng-deep .gjs-cv-canvas { width: calc(100% - 260px); }
    :host ::ng-deep .gjs-block { min-height: 58px; }
  `],
})
export class PageDesignerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('builderHost') builderHost?: ElementRef<HTMLDivElement>;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pageService = inject(PageService);
  private api = inject(ApiService);
  private editor: any;

  pageId = signal<number | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  slugEdited = false;
  form: SavePageRequest = {
    title: '',
    slug: '',
    description: '',
    visibility: 'public',
    is_active: true,
    use_layout: true,
    project_json: '{}',
    html: '',
    css: '',
  };

  async ngAfterViewInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.pageId.set(Number.isFinite(id) && id > 0 ? id : null);
    if (this.pageId()) {
      this.pageService.get(this.pageId()!).subscribe({
        next: page => {
          this.applyPage(page);
          void this.initEditor();
        },
        error: () => { this.error.set('Failed to load page.'); void this.initEditor(); },
      });
      return;
    }
    await this.initEditor();
  }

  ngOnDestroy(): void {
    this.editor?.destroy?.();
  }

  syncSlug(): void {
    if (this.slugEdited) return;
    this.form.slug = this.toSlug(this.form.title);
  }

  save(): void {
    if (!this.editor) return;
    this.error.set('');
    const payload: SavePageRequest = {
      ...this.form,
      slug: this.toSlug(this.form.slug),
      project_json: JSON.stringify(this.editor.getProjectData()),
      html: this.editor.getHtml(),
      css: this.editor.getCss(),
    };
    if (!payload.title.trim()) { this.error.set('Page title is required.'); return; }
    if (!payload.slug.trim()) { this.error.set('Page slug is required.'); return; }

    this.saving.set(true);
    const request = this.pageId()
      ? this.pageService.update(this.pageId()!, payload)
      : this.pageService.create(payload);
    request.subscribe({
      next: page => {
        this.saving.set(false);
        this.applyPage(page);
        if (!this.pageId()) void this.router.navigate(['/admin/pages', page.id, 'designer']);
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.error || 'Failed to save page.');
      },
    });
  }

  private async initEditor(): Promise<void> {
    const host = this.builderHost?.nativeElement;
    if (!host) return;
    const grapesjs = await import('grapesjs');
    const basicBlocks = await import('grapesjs-blocks-basic');
    const exportPlugin = await import('grapesjs-plugin-export');
    const tuiImageEditor = await import('grapesjs-tui-image-editor');
    const formsPlugin = await import('grapesjs-plugin-forms');
    const navbarPlugin = await import('grapesjs-navbar');
    const countdownPlugin = await import('grapesjs-component-countdown');
    const gradientPlugin = await import('grapesjs-style-gradient');
    const filterPlugin = await import('grapesjs-style-filter');
    const backgroundPlugin = await import('grapesjs-style-bg');
    const flexboxPlugin = await import('grapesjs-blocks-flexbox');
    const tabsPlugin = await import('grapesjs-tabs');
    const tooltipPlugin = await import('grapesjs-tooltip');
    const customCodePlugin = await import('grapesjs-custom-code');
    const touchPlugin = await import('grapesjs-touch');
    const postcssParserPlugin = await import('grapesjs-parser-postcss');
    const typedPlugin = await import('grapesjs-typed');
    const clickPlugin = await import('grapesjs-click');
    const floatPlugin = await import('grapesjs-float');
    const plugin = (module: any) => module.default ?? module;
    const safePlugin = (name: string, module: any, options?: Record<string, unknown>) => (editor: any) => {
      try {
        plugin(module)(editor, options);
      } catch (err) {
        console.warn(`GrapesJS plugin "${name}" was skipped because it failed to initialize.`, err);
      }
    };
    this.editor = grapesjs.default.init({
      container: host,
      height: '760px',
      storageManager: false,
      fromElement: false,
      assetManager: {
        upload: false,
        uploadFile: (event: DragEvent) => this.uploadAssets(event),
      },
      selectorManager: { componentFirst: true },
      styleManager: {
        sectors: [
          {
            name: 'Layout',
            open: true,
            properties: ['display', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height', 'min-height', 'margin', 'padding'],
          },
          {
            name: 'Typography',
            open: true,
            properties: ['font-family', 'font-size', 'font-weight', 'letter-spacing', 'color', 'line-height', 'text-align', 'text-decoration'],
          },
          {
            name: 'Background',
            open: true,
            properties: ['background-color', 'background', 'background-image', 'background-repeat', 'background-position', 'background-size'],
          },
          {
            name: 'Border',
            open: false,
            properties: ['border', 'border-radius', 'box-shadow'],
          },
          {
            name: 'Flex',
            open: false,
            properties: ['flex-direction', 'justify-content', 'align-items', 'gap', 'flex-wrap'],
          },
        ],
      },
      plugins: [
        safePlugin('blocks-basic', basicBlocks, {
          blocks: ['column1', 'column2', 'column3', 'column3-7', 'text', 'link', 'image', 'video', 'map'],
          flexGrid: true,
        }),
        safePlugin('export', exportPlugin),
        safePlugin('tui-image-editor', tuiImageEditor),
        safePlugin('forms', formsPlugin),
        safePlugin('navbar', navbarPlugin),
        safePlugin('countdown', countdownPlugin),
        safePlugin('style-gradient', gradientPlugin),
        safePlugin('style-filter', filterPlugin),
        safePlugin('style-bg', backgroundPlugin),
        safePlugin('blocks-flexbox', flexboxPlugin),
        safePlugin('tabs', tabsPlugin),
        safePlugin('tooltip', tooltipPlugin),
        safePlugin('custom-code', customCodePlugin),
        safePlugin('touch', touchPlugin),
        safePlugin('parser-postcss', postcssParserPlugin),
        safePlugin('typed', typedPlugin),
        safePlugin('click', clickPlugin),
        safePlugin('float', floatPlugin),
      ],
    });

    this.addSurveyFlowBlocks();

    this.editor.DomComponents.addType('iframe', {
      model: {
        defaults: {
          traits: [
            { type: 'text', name: 'src', label: 'URL' },
            { type: 'text', name: 'title', label: 'Title' },
            { type: 'text', name: 'height', label: 'Height' },
          ],
        },
      },
    });

    this.loadProject();
    this.loading.set(false);
  }

  private addSurveyFlowBlocks(): void {
    const blocks = this.editor.BlockManager;
    blocks.add('sf-hero', {
      label: 'Hero',
      category: 'SurveyFlow',
      content: '<section style="padding:72px 24px;background:#f8fafc;"><div style="max-width:1120px;margin:0 auto;"><p style="margin:0 0 12px;color:#2563eb;font-weight:700;text-transform:uppercase;font-size:13px;">Page Label</p><h1 style="font-size:48px;line-height:1.08;margin:0 0 18px;color:#111827;">Page heading</h1><p style="max-width:720px;font-size:19px;line-height:1.7;color:#4b5563;margin:0;">Add a clear summary for this page.</p></div></section>',
    });
    blocks.add('sf-navbar', {
      label: 'Navbar',
      category: 'SurveyFlow',
      content: `
        <nav data-gjs-name="Navbar" data-gjs-draggable="true" data-gjs-droppable="true" style="display:flex;align-items:center;justify-content:space-between;gap:24px;padding:18px 32px;background:#ffffff;border-bottom:1px solid #e5e7eb;">
          <a data-gjs-name="Brand" href="#" style="font-size:18px;font-weight:700;color:#111827;text-decoration:none;">Brand</a>
          <div data-gjs-name="Nav Links" style="display:flex;align-items:center;gap:18px;">
            <a data-gjs-name="Nav Link" href="#" style="color:#374151;text-decoration:none;font-weight:500;">Home</a>
            <a data-gjs-name="Nav Link" href="#" style="color:#374151;text-decoration:none;font-weight:500;">About</a>
            <a data-gjs-name="Nav Link" href="#" style="color:#374151;text-decoration:none;font-weight:500;">Contact</a>
          </div>
        </nav>
      `,
    });
    blocks.add('sf-section', {
      label: 'Section',
      category: 'SurveyFlow',
      content: '<section style="padding:48px 24px;"><div style="max-width:1120px;margin:0 auto;"><h2 style="font-size:30px;line-height:1.2;margin:0 0 12px;color:#111827;">Section title</h2><p style="font-size:17px;line-height:1.7;color:#4b5563;margin:0;">Write supporting content here.</p></div></section>',
    });
    blocks.add('sf-card-grid', {
      label: 'Card Grid',
      category: 'SurveyFlow',
      content: '<section style="padding:32px 24px;"><div style="max-width:1120px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;"><article style="border:1px solid #e5e7eb;border-radius:8px;padding:20px;"><h3 style="margin:0 0 8px;font-size:18px;">Card title</h3><p style="margin:0;color:#4b5563;line-height:1.6;">Card content.</p></article><article style="border:1px solid #e5e7eb;border-radius:8px;padding:20px;"><h3 style="margin:0 0 8px;font-size:18px;">Card title</h3><p style="margin:0;color:#4b5563;line-height:1.6;">Card content.</p></article><article style="border:1px solid #e5e7eb;border-radius:8px;padding:20px;"><h3 style="margin:0 0 8px;font-size:18px;">Card title</h3><p style="margin:0;color:#4b5563;line-height:1.6;">Card content.</p></article></div></section>',
    });
    blocks.add('sf-button', {
      label: 'Button',
      category: 'SurveyFlow',
      content: '<a href="#" style="display:inline-block;border-radius:8px;background:#2563eb;color:#fff;padding:12px 18px;text-decoration:none;font-weight:600;">Call to action</a>',
    });
    blocks.add('sf-url-embed', {
      label: 'URL Embed',
      category: 'SurveyFlow',
      content: '<iframe src="https://example.com" title="Embedded content" style="width:100%;height:520px;border:1px solid #d1d5db;border-radius:8px;" loading="lazy"></iframe>',
    });
  }

  private loadProject(): void {
    if (!this.editor) return;
    try {
      const project = JSON.parse(this.form.project_json || '{}');
      if (project?.pages || project?.assets || project?.styles) {
        this.editor.loadProjectData(project);
        if (this.editor.getHtml()?.trim()) return;
        if (this.form.html?.trim()) {
          this.editor.setComponents(this.form.html);
          this.editor.setStyle(this.form.css || '');
        }
        return;
      }
    } catch {}
    if (this.form.html?.trim()) {
      this.editor.setComponents(this.form.html);
      this.editor.setStyle(this.form.css || '');
      return;
    }
    this.editor.setComponents('<main style="font-family:Inter,Arial,sans-serif;color:#111827;"><section style="padding:64px 24px;max-width:1120px;margin:0 auto;"><h1 style="font-size:42px;line-height:1.1;margin:0 0 16px;">New page</h1><p style="font-size:18px;line-height:1.7;color:#4b5563;">Start by dragging blocks from the left panel.</p></section></main>');
  }

  private async uploadAssets(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const dataTransfer = (event as DragEvent).dataTransfer;
    const files = Array.from(dataTransfer?.files ?? input?.files ?? []);
    if (!files.length) return;

    await Promise.all(files.map(async file => {
      const data = new FormData();
      data.append('file', file);
      try {
        const response = await fetch(this.api.apiUrl('/api/uploads'), {
          method: 'POST',
          headers: this.api.getToken() ? { Authorization: `Bearer ${this.api.getToken()}` } : undefined,
          body: data,
        });
        if (!response.ok) throw new Error(`Upload failed (${response.status})`);
        const asset = await response.json();
        if (!asset?.url) return;
        this.editor?.AssetManager?.add({
          src: asset.url,
          name: asset.originalName || asset.name || file.name,
          type: asset.type?.startsWith('image/') ? 'image' : undefined,
        });
      } catch (err) {
        console.warn('Page asset upload failed.', err);
        this.error.set('Asset upload failed. Please check the file type and try again.');
      }
    }));
  }

  private applyPage(page: Page): void {
    const raw = page as Page & {
      isActive?: boolean;
      useLayout?: boolean;
      projectJson?: string;
      createdByUserId?: number;
    };
    this.form = {
      title: page.title,
      slug: page.slug,
      description: page.description || '',
      visibility: page.visibility,
      is_active: page.is_active ?? raw.isActive ?? true,
      use_layout: page.use_layout ?? raw.useLayout ?? true,
      project_json: page.project_json || raw.projectJson || '{}',
      html: page.html || '',
      css: page.css || '',
    };
    this.slugEdited = true;
  }

  private toSlug(value: string): string {
    return (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
}
