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
    <div class="w-full space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-semibold text-gray-800">Site settings</h1>
          <p class="text-sm text-gray-600 mt-1">Configure site name and logos.</p>
        </div>
        <button
          class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          (click)="save()"
          [disabled]="saving() || loading()"
        >{{ saving() ? 'Saving…' : 'Save' }}</button>
      </div>

      @if (error()) {
        <div class="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
      }
      @if (saveSuccess()) {
        <div class="rounded border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-700">Settings saved successfully.</div>
      }

      @if (loading()) {
        <div class="text-gray-500">Loading…</div>
      } @else {
        <div class="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 class="text-base font-semibold mb-4">Site name</h2>
          <input
            class="w-full max-w-md rounded border border-gray-300 px-3 py-2 text-sm"
            [(ngModel)]="siteName"
            placeholder="SurveyFlow"
          />
        </div>

        <div class="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 class="text-base font-semibold mb-4">Logos &amp; Favicon</h2>
          <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            @for (field of logoFields; track field.key) {
              <div>
                <label class="block text-sm font-medium mb-2">{{ field.label }}</label>
                @if (getFieldValue(field.key)) {
                  <img
                    [src]="getFieldValue(field.key)"
                    alt="preview"
                    class="mb-2 h-12 object-contain rounded border border-gray-200"
                  />
                }
                <input
                  type="url"
                  class="w-full rounded border border-gray-300 px-3 py-2 text-sm mb-2"
                  [value]="getFieldValue(field.key)"
                  (input)="setFieldValue(field.key, $event)"
                  placeholder="https://..."
                />
                <input
                  type="file"
                  accept="image/*"
                  class="text-sm"
                  (change)="onFileChange($event, field.key)"
                />
                @if (uploadingField === field.key) {
                  <span class="text-xs text-gray-500 ml-2">Uploading…</span>
                }
              </div>
            }
          </div>
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
