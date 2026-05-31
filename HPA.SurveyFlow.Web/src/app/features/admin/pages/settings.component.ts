import {
  Component,
  OnInit,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService } from '../../../core/services/settings.service';
import { UploadService } from '../../../core/services/upload.service';
import { SiteSettings } from '../../../core/models';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-gray-800 dark:text-white">Site settings</h1>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure site name, logos, and footer display.</p>
        </div>
        <button
          class="ta-btn ta-btn-primary"
          (click)="save()"
          [disabled]="saving() || loading()"
        >{{ saving() ? 'Saving...' : 'Save' }}</button>
      </div>

      @if (error()) {
        <div class="ta-alert-error">{{ error() }}</div>
      }
      @if (saveSuccess()) {
        <div class="ta-alert-success">Settings saved successfully.</div>
      }

      @if (loading()) {
        <div class="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
      } @else {
        <div class="ta-card">
          <h2 class="mb-4 text-base font-semibold text-gray-800 dark:text-white">Site name</h2>
          <label class="ta-field-label" for="siteName">Display name</label>
          <input
            id="siteName"
            class="ta-field max-w-md"
            [(ngModel)]="siteName"
            placeholder="SurveyFlow"
          />
        </div>

        <div class="ta-card">
          <h2 class="mb-4 text-base font-semibold text-gray-800 dark:text-white">Logos &amp; Favicon</h2>
          <label class="mb-6 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              [(ngModel)]="showPublicFormLogo"
            />
            Show logo on public form pages
          </label>
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            @for (field of logoFields; track field.key) {
              <div>
                <label class="ta-field-label" [for]="field.key">{{ field.label }}</label>
                @if (getFieldValue(field.key)) {
                  <img
                    [src]="getFieldValue(field.key)"
                    alt="preview"
                    class="mb-3 h-12 rounded-lg border border-gray-200 object-contain dark:border-gray-700"
                  />
                }
                <input
                  [id]="field.key"
                  type="url"
                  class="ta-field mb-3"
                  [value]="getFieldValue(field.key)"
                  (input)="setFieldValue(field.key, $event)"
                  placeholder="https://..."
                />
                <div class="flex flex-wrap items-center gap-3">
                  <label class="ta-btn ta-btn-secondary cursor-pointer">
                    Upload image
                    <input
                      type="file"
                      accept="image/*"
                      class="sr-only"
                      (change)="onFileChange($event, field.key)"
                    />
                  </label>
                  @if (uploadingField === field.key) {
                    <span class="text-xs text-gray-500 dark:text-gray-400">Uploading...</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <div class="ta-card">
          <h2 class="mb-4 text-base font-semibold text-gray-800 dark:text-white">Copyright</h2>
          <label class="mb-4 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              [(ngModel)]="showCopyright"
            />
            Show copyright
          </label>
          <label class="ta-field-label" for="copyrightText">Copyright text</label>
          <textarea
            id="copyrightText"
            class="ta-field max-w-2xl"
            rows="3"
            [(ngModel)]="copyrightText"
            placeholder="Copyright 2026 SurveyFlow. All rights reserved."
          ></textarea>
        </div>
      }
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  private settingsService = inject(SettingsService);
  private uploadService = inject(UploadService);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  saveSuccess = signal(false);
  settings = signal<SiteSettings | null>(null);

  // Form fields (plain properties for ngModel)
  siteName = '';
  faviconUrl = '';
  logoExpandedLightUrl = '';
  logoExpandedDarkUrl = '';
  logoCollapsedUrl = '';
  copyrightText = '';
  showCopyright = false;
  showPublicFormLogo = false;

  uploadingField: string | null = null;

  logoFields: { key: string; label: string }[] = [
    { key: 'faviconUrl', label: 'Favicon' },
    { key: 'logoExpandedLightUrl', label: 'Expanded logo (light)' },
    { key: 'logoExpandedDarkUrl', label: 'Expanded logo (dark)' },
    { key: 'logoCollapsedUrl', label: 'Collapsed icon' },
  ];

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settingsService.getSiteSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.siteName = s.siteName || '';
        this.faviconUrl = s.faviconUrl || '';
        this.logoExpandedLightUrl = s.logoExpandedLightUrl || '';
        this.logoExpandedDarkUrl = s.logoExpandedDarkUrl || '';
        this.logoCollapsedUrl = s.logoCollapsedUrl || '';
        this.copyrightText = s.copyrightText || '';
        this.showCopyright = !!s.showCopyright;
        this.showPublicFormLogo = !!s.showPublicFormLogo;
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Failed to load settings.');
        this.loading.set(false);
      },
    });
  }

  getFieldValue(key: string): string {
    return (this as any)[key] ?? '';
  }

  setFieldValue(key: string, event: Event): void {
    (this as any)[key] = (event.target as HTMLInputElement).value;
  }

  onFileChange(event: Event, key: string): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingField = key;
    this.uploadService.upload(file).subscribe({
      next: (result) => {
        (this as any)[key] = result.url;
        this.uploadingField = null;
      },
      error: () => {
        this.uploadingField = null;
        this.error.set('Failed to upload image.');
      },
    });
  }

  save(): void {
    this.saving.set(true);
    this.error.set(null);
    this.saveSuccess.set(false);

    const data: Partial<SiteSettings> = {
      siteName: this.siteName,
      faviconUrl: this.faviconUrl || undefined,
      logoExpandedLightUrl: this.logoExpandedLightUrl || undefined,
      logoExpandedDarkUrl: this.logoExpandedDarkUrl || undefined,
      logoCollapsedUrl: this.logoCollapsedUrl || undefined,
      copyrightText: this.copyrightText,
      showCopyright: this.showCopyright,
      showPublicFormLogo: this.showPublicFormLogo,
    };

    this.settingsService.updateSiteSettings(data).subscribe({
      next: (updated) => {
        this.settings.set(updated);
        this.saving.set(false);
        this.saveSuccess.set(true);
        setTimeout(() => this.saveSuccess.set(false), 4000);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message || 'Failed to save settings.');
      },
    });
  }
}
