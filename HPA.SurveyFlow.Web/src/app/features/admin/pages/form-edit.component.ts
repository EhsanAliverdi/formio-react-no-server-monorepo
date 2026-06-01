import { Component, OnInit, ViewChild, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormService } from '../../../core/services/form.service';
import { UserService } from '../../../core/services/user.service';
import { ApiService } from '../../../core/services/api.service';
import { IconService } from '../../../core/services/icon.service';
import { ToastrService } from 'ngx-toastr';
import { FormEditorComponent } from '../../../shared/components/formio/form-editor.component';
import { IntegrationPayloadMappingComponent } from '../../../shared/components/integration-payload-mapping/integration-payload-mapping.component';
import { IconPickerComponent } from '../../../shared/components/icon-picker/icon-picker.component';
import { FormCardComponent } from '../../../shared/components/form-card/form-card.component';
import { Form, User, FormVersion } from '../../../core/models';
import { FormVersionService } from '../../../core/services/form-version.service';
import { CategoryService } from '../../../core/services/category.service';
import { NotificationRulesEditorComponent } from '../components/notification-rules-editor/notification-rules-editor.component';
import { IntegrationRulesEditorComponent } from '../components/integration-rules-editor/integration-rules-editor.component';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';

type WizardPanel = { key: string; title: string };
type SecondarySubmitOutcome = 'success' | 'warning' | 'error';
type SecondarySubmitConfig = { enabled: boolean; integration: string; action: string; fieldMappings?: Record<string, any> };
type ResultActionMode = 'stay' | 'redirect' | 'next_form';
type ResultActionConfig = { mode: ResultActionMode; delaySeconds: number };
type EmailNotificationConfig = { enabled: boolean; to: string; subject: string; bodyHtml: string; attachPdf: boolean };

const SECONDARY_SUBMIT_OUTCOMES = [
  {
    value: 'success' as const,
    label: 'Success',
    description: 'No warning or error answers were found.',
    panelClass: 'border-green-200 bg-green-50/40',
    badgeClass: 'bg-green-100 text-green-800 ring-green-200',
    focusClass: 'focus:ring-green-500',
  },
  {
    value: 'warning' as const,
    label: 'Warning',
    description: 'At least one warning answer was submitted and no error answers were found.',
    panelClass: 'border-amber-200 bg-amber-50/40',
    badgeClass: 'bg-amber-100 text-amber-800 ring-amber-200',
    focusClass: 'focus:ring-amber-500',
  },
  {
    value: 'error' as const,
    label: 'Error',
    description: 'At least one error answer was submitted.',
    panelClass: 'border-red-200 bg-red-50/40',
    badgeClass: 'bg-red-100 text-red-800 ring-red-200',
    focusClass: 'focus:ring-red-500',
  },
];

function defaultSecondarySubmitConfig(enabled = false): SecondarySubmitConfig {
  return { enabled, integration: 'mex', action: 'create_request' };
}

function defaultResultActionConfig(): ResultActionConfig {
  return { mode: 'stay', delaySeconds: 0 };
}

function defaultEmailNotificationConfig(): EmailNotificationConfig {
  return {
    enabled: false,
    to: '',
    subject: 'SurveyFlow {{outcome}} submission #{{submission_id}}',
    bodyHtml: '<p>A {{outcome}} submission was received.</p><p>{{abnormal_answers}}</p>',
    attachPdf: false,
  };
}

function normalizeResultActions(raw: any): Record<SecondarySubmitOutcome, ResultActionConfig> {
  const defaults = {
    success: defaultResultActionConfig(),
    warning: defaultResultActionConfig(),
    error: defaultResultActionConfig(),
  };

  return {
    success: { ...defaults.success, ...(raw?.success ?? {}) },
    warning: { ...defaults.warning, ...(raw?.warning ?? {}) },
    error: { ...defaults.error, ...(raw?.error ?? {}) },
  };
}

function normalizeSecondarySubmitConfig(raw: any): Record<SecondarySubmitOutcome, SecondarySubmitConfig> {
  const defaults = {
    success: defaultSecondarySubmitConfig(),
    warning: defaultSecondarySubmitConfig(),
    error: defaultSecondarySubmitConfig(),
  };

  if (!raw) return defaults;

  const hasOutcomeConfig = ['success', 'warning', 'error'].some((outcome) => raw?.[outcome]);
  if (!hasOutcomeConfig) {
    const legacy = defaultSecondarySubmitConfig(!!raw.enabled);
    legacy.integration = raw.integration || legacy.integration;
    legacy.action = raw.action || legacy.action;
    return { success: { ...legacy }, warning: { ...legacy }, error: { ...legacy } };
  }

  return {
    success: { ...defaults.success, ...(raw.success ?? {}) },
    warning: { ...defaults.warning, ...(raw.warning ?? {}) },
    error: { ...defaults.error, ...(raw.error ?? {}) },
  };
}

function normalizeEmailNotificationConfig(raw: any): Record<SecondarySubmitOutcome, EmailNotificationConfig> {
  const defaults = {
    success: defaultEmailNotificationConfig(),
    warning: defaultEmailNotificationConfig(),
    error: defaultEmailNotificationConfig(),
  };

  return {
    success: { ...defaults.success, ...(raw?.success ?? {}) },
    warning: { ...defaults.warning, ...(raw?.warning ?? {}) },
    error: { ...defaults.error, ...(raw?.error ?? {}) },
  };
}

function getPanels(schema: any): WizardPanel[] {
  const comps: any[] = Array.isArray(schema?.components) ? schema.components : [];
  return comps
    .filter((c: any) => c?.type === 'panel')
    .map((c: any, i: number) => ({
      key: c.key || `page${i + 1}`,
      title: c.breadcrumb || c.title || c.label || c.key || `Page ${i + 1}`,
    }));
}

function ensureWizardHasPage(schema: any): any {
  const comps: any[] = Array.isArray(schema?.components) ? schema.components : [];
  const hasPanel = comps.some((c: any) => c?.type === 'panel');
  if (hasPanel) return schema;
  return {
    ...schema,
    components: [{
      type: 'panel', breadcrumb: 'Page 1', title: 'Page 1',
      label: 'Page 1', key: 'page1', components: comps,
    }],
  };
}

@Component({
  selector: 'app-admin-form-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FormEditorComponent, IntegrationPayloadMappingComponent, IconPickerComponent, FormCardComponent, NotificationRulesEditorComponent, IntegrationRulesEditorComponent, HelpTriggerComponent],
  template: `
    <div>

      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <button type="button" (click)="router.navigate(['/admin/forms'])"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
          Back
        </button>
        <h1 class="text-2xl font-bold text-gray-900">
          Edit Form{{ form() ? ': ' + form()!.name : '' }}
        </h1>
      </div>

      @if (loading()) {
        <div class="flex justify-center items-center py-16">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
      @if (loadError()) {
        <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ loadError() }}</div>
      }

      @if (!loading() && form()) {
        @if (saveError()) {
          <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ saveError() }}</div>
        }

        <!-- ── 1. General Configuration (always open) ─────────────────────── -->
        <div class="mb-4 bg-white rounded-xl border border-gray-200">
          <div class="px-6 py-4 border-b border-gray-100">
            <h2 class="flex items-center gap-1 text-base font-semibold text-gray-900">General Configuration <app-help-trigger helpKey="admin.form.general" label="Help for general form configuration" /></h2>
          </div>
          <div class="px-6 py-5 space-y-4">

            <!-- Form Name -->
            <div>
              <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Form Name <span class="text-red-500">*</span><app-help-trigger helpKey="admin.form.name" label="Help for form name" /></label>
              <input type="text" [(ngModel)]="name" placeholder="Enter form name"
                class="w-full max-w-lg rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
            </div>

            <!-- Visibility + Anonymous -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Visibility <app-help-trigger helpKey="admin.forms.visibility" label="Help for form visibility" /></label>
                <select [(ngModel)]="visibility"
                  class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="public">Public</option>
                  <option value="restricted">Restricted</option>
                </select>
              </div>
              <div class="flex items-end pb-2">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" id="allowAnon" [(ngModel)]="allowAnonymous"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <span class="flex items-center gap-1 text-sm font-medium text-gray-700">Allow anonymous submissions <app-help-trigger helpKey="admin.forms.anonymous" label="Help for anonymous submissions" /></span>
                </label>
              </div>
            </div>

            <!-- Parent form -->
            <div>
              <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Parent form <app-help-trigger helpKey="admin.form.parent" label="Help for parent form" /></label>
              <select [(ngModel)]="parentFormId"
                class="w-full max-w-lg rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option [ngValue]="null">No parent form</option>
                @for (f of parentFormOptions(); track f.id) {
                  <option [ngValue]="f.id">{{ f.name }}</option>
                }
              </select>
              <p class="mt-1 text-xs text-gray-500">Use this when this form is shown after another form is submitted.</p>
            </div>

            <!-- Access control (shown when restricted) -->
            @if (visibility === 'restricted') {
              <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-4">
                <p class="flex items-center gap-1 text-sm font-semibold text-amber-800">Access Control <app-help-trigger helpKey="admin.form.access-control" label="Help for access control" /></p>
                <div>
                  <p class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">Allowed Roles <app-help-trigger helpKey="admin.form.access-control" label="Help for allowed roles" /></p>
                  <div class="flex flex-wrap gap-4">
                    @for (role of availableRoles(); track role.value) {
                      <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" [checked]="allowedRoles.includes(role.value)"
                          (change)="toggleRole(role.value)"
                          class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                        {{ role.label }}
                      </label>
                    }
                  </div>
                </div>
                <div>
                  <p class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">Allowed Users <app-help-trigger helpKey="admin.form.access-control" label="Help for allowed users" /></p>
                  @if (usersLoading()) {
                    <p class="text-sm text-gray-500">Loading users…</p>
                  } @else {
                    <div class="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-3 bg-white">
                      @for (user of allUsers(); track user.id) {
                        <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input type="checkbox" [checked]="allowedUserIds.includes(user.id)"
                            (change)="toggleUser(user.id)"
                            class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                          {{ user.display_name || user.email }}
                          <span class="text-xs text-gray-400">({{ user.role }})</span>
                        </label>
                      }
                    </div>
                  }
                </div>
              </div>
            }

            <!-- Public link -->
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Public Link <span class="font-normal text-gray-400">(no layout)</span><app-help-trigger helpKey="admin.form.public-link" label="Help for public link" /></p>
              <p class="text-xs text-gray-500 mb-2">Share to display the form without the site layout — suitable for embedding or direct distribution.</p>
              <div class="flex items-center gap-2">
                <input type="text" readonly [value]="publicFormUrl()"
                  class="flex-1 max-w-lg rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none"/>
                <button type="button" (click)="copyPublicLink()"
                  class="px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-100 transition text-gray-700">
                  Copy
                </button>
              </div>
            </div>

            <!-- Form Settings checkboxes -->
            <div class="border-t pt-4">
              <p class="text-sm font-semibold text-gray-700 mb-3">Form Settings</p>
              <div class="space-y-2.5">
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="appSettings.previewBeforeSubmit"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <span class="flex items-center gap-1 text-sm text-gray-700">Show preview before submission <app-help-trigger helpKey="admin.form.preview-before-submit" label="Help for submission preview" /></span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="appSettings.allowDraftPdfBeforeSubmit"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <span class="flex items-center gap-1 text-sm text-gray-700">Allow draft PDF before submit <app-help-trigger helpKey="admin.form.draft-pdf" label="Help for draft PDF" /></span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="appSettings.allowSubmissionPdfExport"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <span class="flex items-center gap-1 text-sm text-gray-700">Allow submission PDF export <app-help-trigger helpKey="admin.form.submission-pdf" label="Help for submission PDF export" /></span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="appSettings.showColorCodedAnswers"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <span class="flex items-center gap-2 text-sm text-gray-700">
                    Show color-coded answers while filling
                    <app-help-trigger helpKey="admin.form.color-coded-answers" label="Help for color-coded answers" />
                  </span>
                </label>
              </div>
            </div>

            <!-- Public description -->
            <div>
              <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Public description <app-help-trigger helpKey="admin.form.public-description" label="Help for public description" /></label>
              <textarea [(ngModel)]="appSettings.publicDescription" rows="2" placeholder="Shown to users on the forms list page"
                class="w-full max-w-lg rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
            </div>

            <!-- Category picker -->
            <div class="border-t pt-4">
              <p class="flex items-center gap-1 text-sm font-semibold text-gray-700 mb-1">Category <app-help-trigger helpKey="admin.form.category" label="Help for category" /></p>
              <p class="text-xs text-gray-400 mb-3">
                Assign this form to a category so it appears on the category page.
                Manage categories in <a routerLink="/admin/categories" class="text-indigo-600 hover:underline">Admin → Categories</a>.
              </p>
              <select [(ngModel)]="categorySlug"
                class="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— None —</option>
                @for (cat of availableCategories(); track cat.slug) {
                  <option [value]="cat.slug">{{ cat.name }} ({{ cat.slug }})</option>
                }
              </select>
              @if (categorySlug) {
                <p class="mt-1.5 text-xs text-gray-400">
                  Public URL: <a [href]="'/category/' + categorySlug" target="_blank" class="text-indigo-600 hover:underline font-mono">/category/{{ categorySlug }}</a>
                </p>
              }
            </div>

          </div>
        </div>

        <!-- ── 2. Card (collapsible) ──────────────────────────────────────────── -->
        <div class="mb-4 bg-white rounded-xl border border-gray-200">
          <button type="button" (click)="sectionOpen['styles'] = !sectionOpen['styles']"
            class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors rounded-xl">
            <span class="flex items-center gap-1 text-base font-semibold text-gray-900">Card <app-help-trigger helpKey="admin.form.card" label="Help for form card" /></span>
            <svg class="w-5 h-5 text-gray-400 transition-transform" [class.rotate-180]="sectionOpen['styles']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>

          @if (sectionOpen['styles']) {
            <div class="border-t border-gray-100 px-6 py-5 space-y-5">
              <p class="text-xs text-gray-400">
                Per-form card image and icon. Layout, columns, card style, and display toggles are configured on the
                <a routerLink="/admin/categories" class="text-indigo-600 hover:underline">Category</a>.
              </p>

              <!-- Image -->
              <div>
                <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">Card Image <app-help-trigger helpKey="admin.form.card-image" label="Help for card image" /></label>
                @if (categoryImage) {
                  <div class="mb-3 flex items-start gap-3">
                    <img [src]="categoryImage" alt="Card image" class="h-24 w-40 rounded-lg object-cover border border-gray-200"/>
                    <button type="button" (click)="clearCategoryImage()"
                      class="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition">Remove</button>
                  </div>
                }
                <div class="flex items-center gap-3">
                  <input #imageFileInput type="file" accept="image/*" class="hidden" (change)="uploadCategoryImage($event)"/>
                  <button type="button" (click)="imageFileInput.click()" [disabled]="imageUploading()"
                    class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium rounded-lg transition disabled:opacity-50">
                    @if (imageUploading()) {
                      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                      </svg>
                      Uploading…
                    } @else {
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                      </svg>
                      Upload Image
                    }
                  </button>
                  <span class="text-xs text-gray-400">Recommended: <strong>400 × 300 px</strong>. Max 10 MB.</span>
                </div>
              </div>

              <!-- Icon (used when no image) -->
              <div>
                <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">Card Icon <span class="text-gray-400 font-normal">(used when no image)</span><app-help-trigger helpKey="admin.form.card-icon" label="Help for card icon" /></label>
                <div class="flex items-center gap-3">
                  @if (categoryIcon) {
                    <img [src]="categoryIconSvgUrl()" alt="Selected icon" class="w-10 h-10 object-contain border border-gray-200 rounded-lg p-1"/>
                    <span class="text-xs text-gray-500">{{ categoryIcon }}</span>
                    <button type="button" (click)="categoryIcon = ''"
                      class="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition">Clear</button>
                  }
                  <button type="button" (click)="showIconPicker.set(true)"
                    class="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium rounded-lg transition">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    {{ categoryIcon ? 'Change Icon' : 'Pick Icon' }}
                  </button>
                </div>
              </div>
            </div>
          }
        </div>

        @if (showIconPicker()) {
          <app-icon-picker
            [selectedIcon]="categoryIcon"
            (iconSelected)="onIconSelected($event)"
          />
        }

        <!-- ── 3. Notification Rules (collapsible) ─────────────────────────── -->
        <div class="mb-4 bg-white rounded-xl border border-gray-200">
          <button type="button" (click)="sectionOpen['notif'] = !sectionOpen['notif']"
            class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors rounded-xl">
            <span class="flex items-center gap-1 text-base font-semibold text-gray-900">Notification Rules <app-help-trigger helpKey="admin.form.notification-rules" label="Help for notification rules" /></span>
            <svg class="w-5 h-5 text-gray-400 transition-transform" [class.rotate-180]="sectionOpen['notif']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          @if (sectionOpen['notif']) {
            <div class="border-t border-gray-100 px-6 py-5">
              <app-notification-rules-editor
                [formId]="formId"
                [formSchema]="currentSchema"
              />
            </div>
          }
        </div>

        <!-- ── 4. Integration Rules (collapsible) ──────────────────────────── -->
        <div class="mb-4 bg-white rounded-xl border border-gray-200">
          <button type="button" (click)="sectionOpen['integration'] = !sectionOpen['integration']"
            class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors rounded-xl">
            <span class="flex items-center gap-1 text-base font-semibold text-gray-900">Integration Rules <app-help-trigger helpKey="admin.form.integration-rules" label="Help for integration rules" /></span>
            <svg class="w-5 h-5 text-gray-400 transition-transform" [class.rotate-180]="sectionOpen['integration']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          @if (sectionOpen['integration']) {
            <div class="border-t border-gray-100 px-6 py-5">
              <app-integration-rules-editor
                [formId]="formId"
                [formSchema]="currentSchema"
              />
            </div>
          }
        </div>

        <!-- ── 5. Submission Flow (collapsible) ────────────────────────────── -->
        <div class="mb-4 bg-white rounded-xl border border-gray-200">
          <button type="button" (click)="sectionOpen['flow'] = !sectionOpen['flow']"
            class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors rounded-xl">
            <span class="flex items-center gap-1 text-base font-semibold text-gray-900">Submission Flow <app-help-trigger helpKey="admin.form.submission-flow" label="Help for submission flow" /></span>
            <svg class="w-5 h-5 text-gray-400 transition-transform" [class.rotate-180]="sectionOpen['flow']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          @if (sectionOpen['flow']) {
            <div class="border-t border-gray-100 px-6 py-5">
              <p class="text-xs text-gray-500 mb-4">Configure the message, follow-up routing, and secondary integration submit for each submission outcome.</p>

              <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
                @for (outcome of secondarySubmitOutcomes; track outcome.value) {
                  <section class="rounded-lg border p-4 space-y-4" [class]="outcome.panelClass">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="flex items-center gap-1">
                          <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset" [class]="outcome.badgeClass">
                            {{ outcome.label }}
                          </span>
                          <app-help-trigger helpKey="admin.form.outcomes" label="Help for submission outcomes" />
                        </div>
                        <p class="mt-2 text-xs text-gray-600">{{ outcome.description }}</p>
                      </div>
                      <label class="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
                        <input type="checkbox" [(ngModel)]="secondarySubmitConfigs[outcome.value].enabled"
                          class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                        Integration <app-help-trigger helpKey="admin.form.secondary-submit" label="Help for outcome integration" />
                      </label>
                    </div>

                    <div>
                      <label class="mb-1 flex items-center gap-2 text-xs font-medium text-gray-700">
                        Message <app-help-trigger helpKey="admin.form.outcome-message" label="Help for outcome message" />
                      </label>
                      <textarea [(ngModel)]="appSettings[messageSettingKey(outcome.value)]" rows="3"
                        [placeholder]="messagePlaceholder(outcome.value)"
                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        [class]="outcome.focusClass"></textarea>
                    </div>

                    <div class="grid grid-cols-1 gap-3">
                      <div>
                        <label class="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">After message <app-help-trigger helpKey="admin.form.after-message" label="Help for action after message" /></label>
                        <select [(ngModel)]="resultActions[outcome.value].mode"
                          class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                          [class]="outcome.focusClass">
                          <option value="stay">Stay on result message</option>
                          <option value="redirect">Redirect to URL</option>
                          <option value="next_form">Open follow-up form</option>
                        </select>
                      </div>
                      <div>
                        <label class="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">Delay before action <app-help-trigger helpKey="admin.form.action-delay" label="Help for action delay" /></label>
                        <div class="flex items-center gap-2">
                          <input type="number" min="0" step="1" [(ngModel)]="resultActions[outcome.value].delaySeconds"
                            class="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                            [class]="outcome.focusClass"/>
                          <span class="text-xs text-gray-500">seconds. 0 = immediate.</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label class="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">Redirect URL <app-help-trigger helpKey="admin.form.redirect-url" label="Help for redirect URL" /></label>
                      <input type="url" [(ngModel)]="appSettings[redirectSettingKey(outcome.value)]"
                        placeholder="https://example.com/thank-you"
                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        [class]="outcome.focusClass"/>
                    </div>

                    <div>
                      <label class="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">Follow-up form <app-help-trigger helpKey="admin.form.follow-up-form" label="Help for follow-up form" /></label>
                      <select [(ngModel)]="appSettings.nextForms[outcome.value]"
                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        [class]="outcome.focusClass">
                        <option [ngValue]="null">No follow-up form</option>
                        @for (f of childFormOptions(); track f.id) {
                          <option [ngValue]="f.id">{{ f.name }}</option>
                        }
                      </select>
                    </div>

                    @if (secondarySubmitConfigs[outcome.value].enabled) {
                      <div class="rounded-lg border border-gray-200 bg-white p-3">
                        <div class="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-3">Secondary submit <app-help-trigger helpKey="admin.form.secondary-submit" label="Help for secondary submit" /></div>
                        <div class="grid grid-cols-1 gap-3">
                          <div>
                            <label class="block text-xs font-medium text-gray-700 mb-1">Integration</label>
                            <select [(ngModel)]="secondarySubmitConfigs[outcome.value].integration"
                              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                              <option value="mex">MEX Maintenance</option>
                            </select>
                          </div>
                          <div>
                            <label class="flex items-center gap-1 text-xs font-medium text-gray-700 mb-1">Action <app-help-trigger helpKey="admin.form.secondary-submit" label="Help for secondary submit action" /></label>
                            <select [(ngModel)]="secondarySubmitConfigs[outcome.value].action"
                              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                              <option value="create_request">Create Request</option>
                            </select>
                          </div>
                          <app-integration-payload-mapping
                            [actionKey]="(secondarySubmitConfigs[outcome.value].integration || 'mex') + ':' + (secondarySubmitConfigs[outcome.value].action || 'create_request')"
                            [fieldMappings]="secondarySubmitConfigs[outcome.value].fieldMappings || {}"
                            [formFields]="collectFormFields(currentSchema)"
                            (fieldMappingsChange)="secondarySubmitConfigs[outcome.value].fieldMappings = $event"
                          />
                        </div>
                      </div>
                    }

                    <div class="rounded-lg border border-gray-200 bg-white p-3">
                      <div class="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div class="flex items-center gap-1 text-xs font-semibold text-gray-700">Email notification <app-help-trigger helpKey="admin.form.outcome-email" label="Help for outcome email" /></div>
                          <p class="mt-1 text-xs text-gray-500">Send outcome-based emails to one or more recipients.</p>
                        </div>
                        <label class="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
                          <input type="checkbox" [(ngModel)]="emailNotifications[outcome.value].enabled"
                            class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                          <span class="flex items-center gap-1">Enabled <app-help-trigger helpKey="admin.form.outcome-email" label="Help for enabling outcome email" /></span>
                        </label>
                      </div>

                      @if (emailNotifications[outcome.value].enabled) {
                        <div class="grid grid-cols-1 gap-3">
                          <div>
                            <label class="mb-1 flex items-center gap-2 text-xs font-medium text-gray-700">
                              Recipients <app-help-trigger helpKey="admin.form.email-recipients" label="Help for email recipients" />
                            </label>
                            <textarea [(ngModel)]="emailNotifications[outcome.value].to" rows="2"
                              placeholder="team@example.com, manager@example.com"
                              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                              [class]="outcome.focusClass"></textarea>
                          </div>
                          <div>
                            <label class="mb-1 flex items-center gap-2 text-xs font-medium text-gray-700">
                              Subject <app-help-trigger helpKey="admin.form.email-subject" label="Help for email subject" />
                            </label>
                            <input type="text" [(ngModel)]="emailNotifications[outcome.value].subject"
                              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                              [class]="outcome.focusClass"/>
                          </div>
                          <div>
                            <label class="mb-1 flex items-center gap-2 text-xs font-medium text-gray-700">
                              Body (HTML supported) <app-help-trigger helpKey="admin.form.email-body" label="Help for email body" />
                            </label>
                            <textarea [(ngModel)]="emailNotifications[outcome.value].bodyHtml" rows="6"
                              placeholder="<p>A submission was received.</p>"
                              class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2"
                              [class]="outcome.focusClass"></textarea>
                          </div>
                          <label class="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" [(ngModel)]="emailNotifications[outcome.value].attachPdf"
                              class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                            <span class="flex items-center gap-1 text-sm text-gray-700">Attach submission PDF <app-help-trigger helpKey="admin.form.email-pdf" label="Help for email PDF attachment" /></span>
                          </label>
                        </div>
                      }
                    </div>
                  </section>
                }
              </div>
            </div>
          }
        </div>

        <!-- ── 6. Form Builder (collapsible) ───────────────────────────────── -->
        <div class="mb-4 bg-white rounded-xl border border-gray-200">
          <button type="button" (click)="sectionOpen['builder'] = !sectionOpen['builder']"
            class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors rounded-xl">
            <span class="flex items-center gap-1 text-base font-semibold text-gray-900">Form Builder <app-help-trigger helpKey="admin.form.builder" label="Help for form builder" /></span>
            <svg class="w-5 h-5 text-gray-400 transition-transform" [class.rotate-180]="sectionOpen['builder']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          @if (sectionOpen['builder']) {
            <div class="border-t border-gray-100 px-6 py-5 space-y-4">

              <!-- Form type toggle -->
              <div class="flex items-center gap-4">
                <span class="flex items-center gap-1 text-sm font-medium text-gray-700">Form type: <app-help-trigger helpKey="admin.form.type" label="Help for form type" /></span>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" [(ngModel)]="formDisplay" value="form" (ngModelChange)="onDisplayChange($event)"
                    class="h-4 w-4 border-gray-300 text-indigo-600"/>
                  <span class="text-sm text-gray-700">Single page</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" [(ngModel)]="formDisplay" value="wizard" (ngModelChange)="onDisplayChange($event)"
                    class="h-4 w-4 border-gray-300 text-indigo-600"/>
                  <span class="text-sm text-gray-700">Multi-step wizard</span>
                </label>
              </div>

              <!-- Builder canvas -->
              <app-form-editor #editorRef [formSchema]="currentSchema" (schemaChange)="onSchemaChange($event)"/>
            </div>
          }
        </div>

        <!-- ── Version History (collapsible) ──────────────────────────────── -->
        <div class="mb-4 bg-white rounded-xl border border-gray-200">
          <button type="button" (click)="loadVersions(); sectionOpen['versions'] = !sectionOpen['versions']"
            class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors rounded-xl">
            <span class="flex items-center gap-1 text-base font-semibold text-gray-900">Version History <app-help-trigger helpKey="admin.form.versions" label="Help for version history" /></span>
            <svg class="w-5 h-5 text-gray-400 transition-transform" [class.rotate-180]="sectionOpen['versions']"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          @if (sectionOpen['versions']) {
            <div class="border-t border-gray-100 px-6 py-5">
              @if (versionsLoading()) {
                <p class="text-sm text-gray-400">Loading versions…</p>
              } @else if (versions().length === 0) {
                <p class="text-sm text-gray-400">No saved versions yet. Versions are created automatically when you save form changes.</p>
              } @else {
                <div class="space-y-2">
                  @for (v of versions(); track v.id) {
                    <div class="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <span class="text-sm font-medium text-gray-800">v{{ v.version_number }}</span>
                        <span class="text-xs text-gray-400 ml-3">{{ v.created_at | date:'dd/MM/yy HH:mm' }}</span>
                        @if (v.change_summary) {
                          <span class="text-xs text-gray-500 ml-2">— {{ v.change_summary }}</span>
                        }
                      </div>
                      <div class="flex gap-2">
                        <button type="button" class="text-xs text-indigo-600 hover:underline" (click)="previewVersion(v)">Preview</button>
                        <button type="button" class="text-xs text-amber-600 hover:underline" (click)="restoreVersion(v)">Restore</button>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3 pt-2 pb-8">
          <button type="button" (click)="save()" [disabled]="saving()"
            class="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition">
            @if (saving()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Saving…
            } @else { Save Form }
          </button>
          <button type="button" (click)="router.navigate(['/admin/forms'])"
            class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition">
            Cancel
          </button>
        </div>
      }
    </div>

    <!-- Version preview modal -->
    @if (previewingVersion()) {
      <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" (click)="previewingVersion.set(null)">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold">Version {{ previewingVersion()!.version_number }} Preview</h2>
            <button class="text-gray-400 hover:text-gray-600" (click)="previewingVersion.set(null)">✕</button>
          </div>
          <pre class="flex-1 overflow-auto p-4 text-xs font-mono bg-gray-50">{{ formatVersionJson(previewingVersion()!.json_snapshot) }}</pre>
          <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button class="btn btn-ghost" (click)="previewingVersion.set(null)">Close</button>
            <button class="btn btn-warning" (click)="restoreVersion(previewingVersion()!)">Restore this version</button>
          </div>
        </div>
      </div>
    }
  `,
})
export class FormEditComponent implements OnInit {
  @ViewChild('editorRef') editorRef!: FormEditorComponent;

  router = inject(Router);
  private route = inject(ActivatedRoute);
  private formService = inject(FormService);
  private userService = inject(UserService);
  private categoryService = inject(CategoryService);
  private toastr = inject(ToastrService);
  private http = inject(HttpClient);
  private apiService = inject(ApiService);
  private iconService = inject(IconService);
  private formVersionService = inject(FormVersionService);

  form = signal<Form | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);
  usersLoading = signal(false);
  imageUploading = signal(false);
  allUsers = signal<User[]>([]);
  allForms = signal<Form[]>([]);
  wizardPanels = signal<WizardPanel[]>([]);
  activePageIndex = signal(0);
  showIconPicker = signal(false);

  versions = signal<FormVersion[]>([]);
  versionsLoading = signal(false);
  versionsLoaded = false;
  previewingVersion = signal<FormVersion | null>(null);

  sectionOpen: Record<string, boolean> = {
    styles: false,
    notif: false,
    integration: false,
    flow: false,
    builder: true,
    versions: false,
  };

  name = '';
  allowAnonymous = false;
  visibility = 'public';
  formDisplay: 'form' | 'wizard' = 'form';
  allowedRoles: string[] = [];
  allowedUserIds: number[] = [];
  parentFormId: number | null = null;
  appSettings: any = {};
  categorySlug = '';
  categoryImage = '';
  categoryImageFullWidth = false;
  categoryIcon = '';
  secondarySubmitOutcomes = SECONDARY_SUBMIT_OUTCOMES;
  secondarySubmitConfigs: Record<SecondarySubmitOutcome, SecondarySubmitConfig> = normalizeSecondarySubmitConfig(null);
  resultActions: Record<SecondarySubmitOutcome, ResultActionConfig> = normalizeResultActions(null);
  emailNotifications: Record<SecondarySubmitOutcome, EmailNotificationConfig> = normalizeEmailNotificationConfig(null);
  currentSchema: any = {};

  availableCategories = signal<{ slug: string; name: string }[]>([]);

  availableRoles = signal<{ value: string; label: string }[]>([
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
  ]);

  formId!: number;

  publicFormUrl = computed(() =>
    this.formId ? `${window.location.origin}/form-public/${this.formId}` : ''
  );
  parentFormOptions = computed(() => this.allForms().filter(f => f.id !== this.formId));
  childFormOptions = computed(() => this.allForms().filter(f => f.id !== this.formId));

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) { this.loadError.set('No form ID.'); this.loading.set(false); return; }
    this.formId = Number(idStr);
    this.formService.get(this.formId).subscribe({
      next: (f) => {
        this.form.set(f);
        this.name = f.name;
        this.allowAnonymous = !!f.allow_anonymous_submit;
        this.visibility = f.visibility;
        this.parentFormId = f.parent_form_id ?? null;
        this.allowedRoles = f.allowed_roles ?? [];
        this.allowedUserIds = f.allowed_user_ids ?? [];
        let schema = f.json ?? {};
        if (typeof schema === 'string') { try { schema = JSON.parse(schema); } catch { schema = {}; } }
        this.appSettings = { nextForms: {}, ...(schema.appSettings ?? {}) };
        this.appSettings.nextForms = { success: null, warning: null, error: null, ...(this.appSettings.nextForms ?? {}) };
        this.categorySlug = schema.appSettings?.categorySlug || (schema.appSettings?.preStart ? 'pre-start' : '');
        this.categoryImage = schema.appSettings?.categoryImage || schema.appSettings?.preStartImage || '';
        this.categoryImageFullWidth = !!(schema.appSettings?.categoryImageFullWidth ?? schema.appSettings?.preStartImageFullWidth);
        this.categoryIcon = schema.appSettings?.categoryIcon || schema.appSettings?.preStartIcon || schema.appSettings?.formsListIconKey || '';
        this.secondarySubmitConfigs = normalizeSecondarySubmitConfig(schema.appSettings?.secondarySubmit);
        this.resultActions = normalizeResultActions(schema.appSettings?.resultActions);
        this.emailNotifications = normalizeEmailNotificationConfig(schema.appSettings?.emailNotifications);
        this.formDisplay = schema.display === 'wizard' ? 'wizard' : 'form';
        this.currentSchema = schema;
        this.wizardPanels.set(getPanels(schema));
        this.loading.set(false);
      },
      error: (err) => { this.loadError.set(err?.error?.error || 'Failed to load form.'); this.loading.set(false); },
    });
    this.loadUsers();
    this.loadForms();
    this.loadRoles();
    this.loadCategories();
  }

  private loadCategories(): void {
    this.categoryService.list().subscribe({
      next: (cats) => this.availableCategories.set(cats.map(c => ({ slug: c.slug, name: c.name }))),
      error: () => {},
    });
  }

  private loadRoles(): void {
    this.userService.getRoles().subscribe({
      next: (roles) => this.availableRoles.set(
        roles.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))
      ),
      error: () => {},
    });
  }

  private loadUsers(): void {
    this.usersLoading.set(true);
    this.userService.list().subscribe({
      next: (u) => { this.allUsers.set(u); this.usersLoading.set(false); },
      error: () => this.usersLoading.set(false),
    });
  }

  private loadForms(): void {
    this.formService.list().subscribe({
      next: (forms) => this.allForms.set(forms),
      error: () => {},
    });
  }

  loadVersions(): void {
    if (this.versionsLoaded) return;
    this.versionsLoaded = true;
    this.versionsLoading.set(true);
    this.formVersionService.list(this.formId).subscribe({
      next: v => { this.versions.set(v); this.versionsLoading.set(false); },
      error: () => this.versionsLoading.set(false),
    });
  }

  previewVersion(v: FormVersion): void { this.previewingVersion.set(v); }

  restoreVersion(v: FormVersion): void {
    if (!confirm(`Restore form to version ${v.version_number}? Current form will be snapshotted first.`)) return;
    this.formVersionService.restore(this.formId, v.version_number).subscribe({
      next: () => {
        this.previewingVersion.set(null);
        this.versionsLoaded = false;
        this.toastr.success(`Restored to version ${v.version_number}`);
        this.ngOnInit();
      },
      error: () => this.toastr.error('Failed to restore version.'),
    });
  }

  formatVersionJson(raw: string | undefined): string {
    if (!raw) return '';
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  }

  onSchemaChange(schema: any): void {
    this.currentSchema = schema;
    this.wizardPanels.set(getPanels(schema));
  }

  onDisplayChange(display: string): void {
    let schema = this.editorRef ? this.editorRef.getSchema() : this.currentSchema;
    schema = { ...schema, display };
    if (display === 'wizard') schema = ensureWizardHasPage(schema);
    this.currentSchema = schema;
    this.wizardPanels.set(getPanels(schema));
  }

  selectPage(i: number): void {
    this.activePageIndex.set(i);
  }

  addPage(): void {
    const schema = this.editorRef ? this.editorRef.getSchema() : this.currentSchema;
    const comps: any[] = Array.isArray(schema.components) ? [...schema.components] : [];
    const idx = comps.length + 1;
    comps.push({ type: 'panel', breadcrumb: `Page ${idx}`, title: `Page ${idx}`, label: `Page ${idx}`, key: `page${idx}`, components: [] });
    const next = { ...schema, display: 'wizard', components: comps };
    this.currentSchema = next;
    this.wizardPanels.set(getPanels(next));
    this.activePageIndex.set(comps.length - 1);
  }

  deletePage(i: number): void {
    const schema = this.editorRef ? this.editorRef.getSchema() : this.currentSchema;
    const comps: any[] = Array.isArray(schema.components) ? [...schema.components] : [];
    comps.splice(i, 1);
    const next = { ...schema, components: comps };
    this.currentSchema = next;
    this.wizardPanels.set(getPanels(next));
    const newActive = Math.min(this.activePageIndex(), comps.length - 1);
    this.activePageIndex.set(Math.max(0, newActive));
  }

  renamePage(i: number): void {
    const panels = this.wizardPanels();
    const current = panels[i]?.title ?? `Page ${i + 1}`;
    const newTitle = prompt('Rename page:', current);
    if (!newTitle?.trim()) return;
    const schema = this.editorRef ? this.editorRef.getSchema() : this.currentSchema;
    const comps: any[] = Array.isArray(schema.components) ? [...schema.components] : [];
    comps[i] = { ...comps[i], breadcrumb: newTitle.trim(), title: newTitle.trim(), label: newTitle.trim() };
    const next = { ...schema, components: comps };
    this.currentSchema = next;
    this.wizardPanels.set(getPanels(next));
  }

  movePage(i: number, dir: -1 | 1): void {
    const schema = this.editorRef ? this.editorRef.getSchema() : this.currentSchema;
    const comps: any[] = Array.isArray(schema.components) ? [...schema.components] : [];
    const j = i + dir;
    if (j < 0 || j >= comps.length) return;
    [comps[i], comps[j]] = [comps[j], comps[i]];
    const next = { ...schema, components: comps };
    this.currentSchema = next;
    this.wizardPanels.set(getPanels(next));
    this.activePageIndex.set(j);
  }

  categoryIconSvgUrl = computed(() => {
    if (!this.categoryIcon || !this.categoryIcon.includes(':')) return '';
    const [pack, name] = this.categoryIcon.split(':', 2);
    return this.iconService.getSvgUrl(pack, name);
  });

  onIconSelected(iconKey: string): void {
    this.showIconPicker.set(false);
    this.categoryIcon = iconKey;
  }

  clearCategoryImage(): void {
    this.categoryImage = '';
  }

  uploadCategoryImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';
    const formData = new FormData();
    formData.append('file', file);
    this.imageUploading.set(true);
    this.http.post<{ url: string }>(this.apiService.apiUrl('/api/uploads'), formData).subscribe({
      next: (res) => {
        this.categoryImage = res.url;
        this.imageUploading.set(false);
        this.toastr.success('Image uploaded.');
      },
      error: (err) => {
        this.imageUploading.set(false);
        this.toastr.error(err?.error?.error || 'Image upload failed.');
      },
    });
  }

  copyPublicLink(): void {
    navigator.clipboard.writeText(this.publicFormUrl()).then(() => {
      this.toastr.success('Link copied to clipboard.');
    });
  }

  toggleRole(role: string): void {
    this.allowedRoles = this.allowedRoles.includes(role)
      ? this.allowedRoles.filter(r => r !== role)
      : [...this.allowedRoles, role];
  }

  toggleUser(id: number): void {
    this.allowedUserIds = this.allowedUserIds.includes(id)
      ? this.allowedUserIds.filter(u => u !== id)
      : [...this.allowedUserIds, id];
  }

  messageSettingKey(outcome: SecondarySubmitOutcome): string {
    return `messageOn${this.capitalizeOutcome(outcome)}`;
  }

  redirectSettingKey(outcome: SecondarySubmitOutcome): string {
    return `redirectOn${this.capitalizeOutcome(outcome)}`;
  }

  messagePlaceholder(outcome: SecondarySubmitOutcome): string {
    if (outcome === 'success') return 'Thank you for your submission.';
    if (outcome === 'warning') return 'Submission received with warnings: {{warning_questions}}.';
    return 'Please review these answers: {{error_questions}}.';
  }

  private capitalizeOutcome(outcome: SecondarySubmitOutcome): string {
    return outcome.charAt(0).toUpperCase() + outcome.slice(1);
  }

  save(): void {
    if (!this.name.trim()) { this.saveError.set('Form name is required.'); return; }
    this.saveError.set(null);
    const schema = this.editorRef ? this.editorRef.getSchema() : this.currentSchema;
    const secondarySubmit = {
      success: { ...this.secondarySubmitConfigs.success },
      warning: { ...this.secondarySubmitConfigs.warning },
      error: { ...this.secondarySubmitConfigs.error },
    };
    const resultActions = {
      success: { ...this.resultActions.success, delaySeconds: Number(this.resultActions.success.delaySeconds) || 0 },
      warning: { ...this.resultActions.warning, delaySeconds: Number(this.resultActions.warning.delaySeconds) || 0 },
      error: { ...this.resultActions.error, delaySeconds: Number(this.resultActions.error.delaySeconds) || 0 },
    };
    const emailNotifications = {
      success: { ...this.emailNotifications.success },
      warning: { ...this.emailNotifications.warning },
      error: { ...this.emailNotifications.error },
    };
    const finalSchema = {
      ...schema,
      display: this.formDisplay,
      appSettings: {
        ...this.appSettings,
        resultActions,
        secondarySubmit,
        emailNotifications,
        categorySlug: this.categorySlug.trim() || null,
        categoryImage: this.categoryImage || null,
        categoryImageFullWidth: this.categoryImageFullWidth,
        categoryIcon: this.categoryIcon || null,
        formsListIconKey: this.categoryIcon || this.appSettings.formsListIconKey || null,
        showIconInFormsList: !!this.categorySlug.trim(),
      },
    };
    // Clean up legacy pre-start keys
    delete finalSchema.appSettings.preStart;
    delete finalSchema.appSettings.preStartImage;
    delete finalSchema.appSettings.preStartImageFullWidth;
    delete finalSchema.appSettings.preStartIcon;
    delete finalSchema.appSettings.preStartShowTitle;
    delete finalSchema.appSettings.preStartShowDescription;
    delete finalSchema.appSettings.preStartButtonText;
    // Remove legacy per-category display fields now managed by the Category entity
    delete finalSchema.appSettings.categoryName;
    delete finalSchema.appSettings.categoryVisibility;
    delete finalSchema.appSettings.categoryShowTitle;
    delete finalSchema.appSettings.categoryShowDescription;
    delete finalSchema.appSettings.categoryButtonText;
    this.saving.set(true);
    this.formService.update(this.formId, {
      name: this.name.trim(),
      json: finalSchema,
      allow_anonymous_submit: this.allowAnonymous ? 1 : 0,
      visibility: this.visibility,
      parent_form_id: this.parentFormId,
      allowed_roles: this.allowedRoles,
      allowed_user_ids: this.allowedUserIds,
    }).subscribe({
      next: () => { this.toastr.success('Form updated.'); this.router.navigate(['/admin/forms']); },
      error: (err) => { this.saving.set(false); this.saveError.set(err?.error?.error || 'Failed to update form.'); this.toastr.error(this.saveError()!); },
    });
  }

  collectFormFields(schema: any): { key: string; label: string; type: string }[] {
    const fields: { key: string; label: string; type: string }[] = [];
    const visit = (node: any) => {
      if (!node || typeof node !== 'object') return;
      if (node.key && node.type && node.type !== 'button' && node.input !== false)
        fields.push({ key: node.key, label: node.label || node.key, type: node.type });
      for (const c of node.components ?? []) visit(c);
      for (const col of node.columns ?? []) for (const c of col.components ?? []) visit(c);
      for (const row of node.rows ?? []) for (const col of row ?? []) for (const c of col.components ?? []) visit(c);
    };
    visit(schema);
    return fields;
  }

  private normalizeCategorySlug(value: string): string {
    return (value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
