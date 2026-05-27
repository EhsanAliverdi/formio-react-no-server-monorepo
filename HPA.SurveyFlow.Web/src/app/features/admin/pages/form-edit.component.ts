import { Component, OnInit, ViewChild, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute } from '@angular/router';
import { FormService } from '../../../core/services/form.service';
import { UserService } from '../../../core/services/user.service';
import { ApiService } from '../../../core/services/api.service';
import { ToastrService } from 'ngx-toastr';
import { FormEditorComponent } from '../../../shared/components/formio/form-editor.component';
import { IntegrationPayloadMappingComponent } from '../../../shared/components/integration-payload-mapping/integration-payload-mapping.component';
import { IconPickerComponent } from '../../../shared/components/icon-picker/icon-picker.component';
import { IconService } from '../../../core/services/icon.service';
import { Form, User } from '../../../core/models';

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
  imports: [CommonModule, FormsModule, FormEditorComponent, IntegrationPayloadMappingComponent, IconPickerComponent],
  template: `
    <div class="p-6">
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

        <!-- Basic settings -->
        <div class="mb-6 space-y-4 bg-white rounded-xl border border-gray-200 p-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Form Name <span class="text-red-500">*</span></label>
            <input type="text" [(ngModel)]="name" placeholder="Enter form name"
              class="w-full max-w-lg rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
          </div>
          <div class="flex items-center gap-3">
            <input type="checkbox" id="allowAnon" [(ngModel)]="allowAnonymous"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
            <label for="allowAnon" class="text-sm font-medium text-gray-700">Allow anonymous submissions</label>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
            <select [(ngModel)]="visibility"
              class="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="public">Public</option>
              <option value="restricted">Restricted</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Parent form</label>
            <select [(ngModel)]="parentFormId"
              class="w-full max-w-lg rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option [ngValue]="null">No parent form</option>
              @for (f of parentFormOptions(); track f.id) {
                <option [ngValue]="f.id">{{ f.name }}</option>
              }
            </select>
            <p class="mt-1 text-xs text-gray-500">Use this when this form is shown after another form is submitted.</p>
          </div>
        </div>

        <!-- Access control (shown when restricted) -->
        @if (visibility === 'restricted') {
          <div class="mb-6 bg-white rounded-xl border border-gray-200 p-6">
            <h2 class="text-base font-semibold text-gray-800 mb-4">Access Control</h2>
            <div class="mb-4">
              <p class="text-sm font-medium text-gray-700 mb-2">Allowed Roles</p>
              <div class="flex flex-wrap gap-4">
                @for (role of availableRoles; track role.value) {
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
              <p class="text-sm font-medium text-gray-700 mb-2">Allowed Users</p>
              @if (usersLoading()) {
                <p class="text-sm text-gray-500">Loading users…</p>
              } @else {
                <div class="max-h-48 overflow-y-auto space-y-1 border border-gray-200 rounded-lg p-3">
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
        <div class="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-base font-semibold text-gray-800 mb-3">Public Link (No Layout)</h2>
          <p class="text-xs text-gray-500 mb-2">Share this link to display the form without the site layout — suitable for embedding or direct distribution.</p>
          <div class="flex items-center gap-2">
            <input type="text" readonly [value]="publicFormUrl()"
              class="flex-1 max-w-lg rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:outline-none"/>
            <button type="button" (click)="copyPublicLink()"
              class="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 transition text-gray-700">
              Copy
            </button>
          </div>
        </div>

        <!-- App settings -->
        <div class="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-base font-semibold text-gray-800 mb-4">Form Settings</h2>
          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" [(ngModel)]="appSettings.previewBeforeSubmit"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
              <span class="text-sm text-gray-700">Show preview before submission</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" [(ngModel)]="appSettings.allowDraftPdfBeforeSubmit"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
              <span class="text-sm text-gray-700">Allow draft PDF before submit</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" [(ngModel)]="appSettings.allowSubmissionPdfExport"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
              <span class="text-sm text-gray-700">Allow submission PDF export</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" [(ngModel)]="appSettings.showColorCodedAnswers"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
              <span class="flex items-center gap-2 text-sm text-gray-700">
                Show color-coded answers while filling
                <span class="cursor-help rounded-full border border-gray-300 px-1.5 text-[10px] text-gray-500"
                  title="When enabled, answers configured in the Abnormalities tab are highlighted for people filling the form: green for normal, amber for warning, and red for critical/error.">
                  ?
                </span>
              </span>
            </label>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Public description</label>
              <textarea [(ngModel)]="appSettings.publicDescription" rows="2" placeholder="Shown to users on the forms list page"
                class="w-full max-w-lg rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
            </div>
          </div>

          <div class="mt-6 border-t pt-5">
            <div class="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 class="text-sm font-semibold text-gray-800">Submission Result Flow</h3>
                <p class="text-xs text-gray-500 mt-1">Configure the message, follow-up routing, and secondary integration submit for each submission outcome.</p>
              </div>
              <span class="text-xs text-gray-500" [attr.title]="placeholderHelp">
                Placeholder help
              </span>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
              @for (outcome of secondarySubmitOutcomes; track outcome.value) {
                <section class="rounded-lg border p-4 space-y-4" [class]="outcome.panelClass">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset" [class]="outcome.badgeClass">
                        {{ outcome.label }}
                      </span>
                      <p class="mt-2 text-xs text-gray-600">{{ outcome.description }}</p>
                    </div>
                    <label class="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
                      <input type="checkbox" [(ngModel)]="secondarySubmitConfigs[outcome.value].enabled"
                        class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                      Integration
                    </label>
                  </div>

                  <div>
                    <label class="mb-1 flex items-center gap-2 text-xs font-medium text-gray-700">
                      Message
                      <span class="cursor-help rounded-full border border-gray-300 px-1.5 text-[10px] text-gray-500"
                        [attr.title]="placeholderHelp">
                        ?
                      </span>
                    </label>
                    <textarea [(ngModel)]="appSettings[messageSettingKey(outcome.value)]" rows="3"
                      [placeholder]="messagePlaceholder(outcome.value)"
                      class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      [class]="outcome.focusClass"></textarea>
                  </div>

                  <div class="grid grid-cols-1 gap-3">
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">After message</label>
                      <select [(ngModel)]="resultActions[outcome.value].mode"
                        class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                        [class]="outcome.focusClass">
                        <option value="stay">Stay on result message</option>
                        <option value="redirect">Redirect to URL</option>
                        <option value="next_form">Open follow-up form</option>
                      </select>
                    </div>
                    <div>
                      <label class="block text-xs font-medium text-gray-700 mb-1">Delay before action</label>
                      <div class="flex items-center gap-2">
                        <input type="number" min="0" step="1" [(ngModel)]="resultActions[outcome.value].delaySeconds"
                          class="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                          [class]="outcome.focusClass"/>
                        <span class="text-xs text-gray-500">seconds. Use 0 for immediate.</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Redirect URL</label>
                    <input type="url" [(ngModel)]="appSettings[redirectSettingKey(outcome.value)]"
                      placeholder="https://example.com/thank-you"
                      class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      [class]="outcome.focusClass"/>
                  </div>

                  <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">Follow-up form</label>
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
                      <div class="text-xs font-semibold text-gray-700 mb-3">Secondary submit</div>
                      <div class="grid grid-cols-1 gap-3">
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">Integration</label>
                          <select [(ngModel)]="secondarySubmitConfigs[outcome.value].integration"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="mex">MEX Maintenance</option>
                          </select>
                        </div>
                        <div>
                          <label class="block text-xs font-medium text-gray-700 mb-1">Action</label>
                          <select [(ngModel)]="secondarySubmitConfigs[outcome.value].action"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="create_request">Create Request</option>
                          </select>
                        </div>
                        <app-integration-payload-mapping
                          [config]="secondarySubmitConfigs[outcome.value]"
                          [formSchema]="currentSchema"
                        />
                      </div>
                    </div>
                  }

                  <div class="rounded-lg border border-gray-200 bg-white p-3">
                    <div class="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div class="text-xs font-semibold text-gray-700">Email notification</div>
                        <p class="mt-1 text-xs text-gray-500">Send outcome-based emails to one or more recipients. HTML is supported in the body.</p>
                      </div>
                      <label class="inline-flex items-center gap-2 text-xs font-medium text-gray-700">
                        <input type="checkbox" [(ngModel)]="emailNotifications[outcome.value].enabled"
                          class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                        Enabled
                      </label>
                    </div>

                    @if (emailNotifications[outcome.value].enabled) {
                      <div class="grid grid-cols-1 gap-3">
                        <div>
                          <label class="mb-1 flex items-center gap-2 text-xs font-medium text-gray-700">
                            Recipients
                            <span class="cursor-help rounded-full border border-gray-300 px-1.5 text-[10px] text-gray-500"
                              title="Separate recipients with commas, semicolons, or new lines.">
                              ?
                            </span>
                          </label>
                          <textarea [(ngModel)]="emailNotifications[outcome.value].to" rows="2"
                            placeholder="team@example.com, manager@example.com"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                            [class]="outcome.focusClass"></textarea>
                        </div>

                        <div>
                          <label class="mb-1 flex items-center gap-2 text-xs font-medium text-gray-700">
                            Subject
                            <span class="cursor-help rounded-full border border-gray-300 px-1.5 text-[10px] text-gray-500"
                              [attr.title]="placeholderHelp">
                              ?
                            </span>
                          </label>
                          <input type="text" [(ngModel)]="emailNotifications[outcome.value].subject"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                            [class]="outcome.focusClass"/>
                        </div>

                        <div>
                          <label class="mb-1 flex items-center gap-2 text-xs font-medium text-gray-700">
                            Body (HTML supported)
                            <span class="cursor-help rounded-full border border-gray-300 px-1.5 text-[10px] text-gray-500"
                              [attr.title]="placeholderHelp">
                              ?
                            </span>
                          </label>
                          <textarea [(ngModel)]="emailNotifications[outcome.value].bodyHtml" rows="6"
                            placeholder="<p>A {{outcome}} submission was received.</p>"
                            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2"
                            [class]="outcome.focusClass"></textarea>
                        </div>

                        <label class="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" [(ngModel)]="emailNotifications[outcome.value].attachPdf"
                            class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                          <span class="text-sm text-gray-700">Attach submission PDF</span>
                        </label>
                      </div>
                    }
                  </div>
                </section>
              }
            </div>
          </div>
        </div>

        <!-- Category card appearance -->
        <div class="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-base font-semibold text-gray-800 mb-4">Category Card</h2>
          <div class="space-y-4">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" [(ngModel)]="categoryEnabled"
                class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
              <span class="text-sm text-gray-700 font-medium">Show on a category page</span>
            </label>

            @if (categoryEnabled) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Category slug <span class="text-red-500">*</span></label>
                  <input type="text" [(ngModel)]="categorySlug" placeholder="pre-start"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                  <p class="mt-1 text-xs text-gray-500">Used in the public URL, for example <code>/category/pre-start</code>.</p>
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Category name</label>
                  <input type="text" [(ngModel)]="categoryName" placeholder="Pre-Start"
                    class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
              <!-- Image upload -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Card Image (optional)</label>
                @if (categoryImage) {
                  <div class="mb-3 flex items-start gap-3">
                    <img [src]="categoryImage" alt="Card image" class="h-24 w-40 rounded-lg object-cover border border-gray-200"/>
                    <button type="button" (click)="clearCategoryImage()"
                      class="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition">
                      Remove
                    </button>
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
                  <span class="text-xs text-gray-400">Recommended: <strong>400 × 300 px</strong> (4:3) or square. Max 10MB. Image takes priority over icon.</span>
                </div>
                @if (categoryImage) {
                  <label class="mt-3 flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="categoryImageFullWidth"
                      class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                    <span class="text-sm text-gray-700">Full-width image <span class="text-gray-400 font-normal">(edge-to-edge, <code>object-cover</code>)</span></span>
                  </label>
                }
              </div>

              <!-- Icon picker -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Card Icon (used when no image)</label>
                <div class="flex items-center gap-3">
                  @if (categoryIcon) {
                    <img [src]="categoryIconSvgUrl()" alt="Selected icon" class="w-10 h-10 object-contain border border-gray-200 rounded-lg p-1"/>
                    <span class="text-xs text-gray-500">{{ categoryIcon }}</span>
                    <button type="button" (click)="categoryIcon = ''"
                      class="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition">
                      Clear
                    </button>
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

              <!-- Card display options -->
              <div class="border-t pt-4 space-y-3">
                <p class="text-sm font-medium text-gray-700">Card display options</p>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="categoryShowTitle"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <span class="text-sm text-gray-700">Show form title on card</span>
                </label>
                <label class="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" [(ngModel)]="categoryShowDescription"
                    class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
                  <span class="text-sm text-gray-700">Show description on card</span>
                </label>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">Button text</label>
                  <input type="text" [(ngModel)]="categoryButtonText" placeholder="Start"
                    class="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
              </div>
            }
          </div>
        </div>

        @if (showIconPicker()) {
          <app-icon-picker
            [selectedIcon]="categoryIcon"
            (iconSelected)="onIconSelected($event)"
          />
        }

        <!-- Wizard / Single-page toggle -->
        <div class="mb-4 bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <span class="text-sm font-medium text-gray-700">Form type:</span>
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

        <!-- Wizard page management -->
        @if (false && formDisplay === 'wizard') {
          <div class="mb-4 bg-white rounded-xl border border-gray-200 p-4">
            <div class="flex items-center gap-2 flex-wrap">
              @for (panel of wizardPanels(); track panel.key; let i = $index) {
                <div class="inline-flex items-center gap-1 rounded-full border px-3 py-1"
                  [class]="activePageIndex() === i
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-white'">
                  <button type="button" (click)="selectPage(i)"
                    class="text-sm"
                    [class]="activePageIndex() === i ? 'font-semibold text-blue-700' : 'font-medium text-gray-800'">
                    {{ panel.title }}
                  </button>
                  <button type="button" (click)="renamePage(i)" title="Rename"
                    class="ml-1 text-gray-400 hover:text-gray-700 text-xs">✏️</button>
                  @if (wizardPanels().length > 1) {
                    <button type="button" (click)="deletePage(i)" title="Delete"
                      class="ml-0.5 text-gray-400 hover:text-red-600 text-xs">✕</button>
                  }
                  @if (i > 0) {
                    <button type="button" (click)="movePage(i, -1)" title="Move left"
                      class="ml-0.5 text-gray-400 hover:text-gray-700 text-xs">◀</button>
                  }
                  @if (i < wizardPanels().length - 1) {
                    <button type="button" (click)="movePage(i, 1)" title="Move right"
                      class="ml-0.5 text-gray-400 hover:text-gray-700 text-xs">▶</button>
                  }
                </div>
              }
              <button type="button" (click)="addPage()"
                class="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600">
                + Add page
              </button>
            </div>
          </div>
        }

        <!-- Schema builder -->
        <div class="mb-6 bg-white rounded-xl border border-gray-200 p-6">
          <h2 class="text-base font-semibold text-gray-800 mb-4">Form Builder</h2>
          <app-form-editor #editorRef [formSchema]="currentSchema" (schemaChange)="onSchemaChange($event)"/>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-3">
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
  `,
})
export class FormEditComponent implements OnInit {
  @ViewChild('editorRef') editorRef!: FormEditorComponent;

  router = inject(Router);
  private route = inject(ActivatedRoute);
  private formService = inject(FormService);
  private userService = inject(UserService);
  private toastr = inject(ToastrService);
  private http = inject(HttpClient);
  private apiService = inject(ApiService);
  private iconService = inject(IconService);

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

  name = '';
  allowAnonymous = false;
  visibility = 'public';
  formDisplay: 'form' | 'wizard' = 'form';
  allowedRoles: string[] = [];
  allowedUserIds: number[] = [];
  parentFormId: number | null = null;
  appSettings: any = {};
  categoryEnabled = false;
  categorySlug = '';
  categoryName = '';
  categoryImage = '';
  categoryImageFullWidth = false;
  categoryIcon = '';
  categoryShowTitle = true;
  categoryShowDescription = true;
  categoryButtonText = '';
  placeholderHelp = 'Available placeholders: {{outcome}}, {{submission_id}}, {{form_name}}, {{user_email}}, {{error_count}}, {{warning_count}}, {{abnormal_questions}}, {{error_questions}}, {{warning_questions}}, {{abnormal_answers}}, {{error_answers}}, {{warning_answers}}.';
  secondarySubmitOutcomes = SECONDARY_SUBMIT_OUTCOMES;
  secondarySubmitConfigs: Record<SecondarySubmitOutcome, SecondarySubmitConfig> = normalizeSecondarySubmitConfig(null);
  resultActions: Record<SecondarySubmitOutcome, ResultActionConfig> = normalizeResultActions(null);
  emailNotifications: Record<SecondarySubmitOutcome, EmailNotificationConfig> = normalizeEmailNotificationConfig(null);
  currentSchema: any = {};

  availableRoles = [
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
  ];

  private formId!: number;

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
        this.categoryEnabled = !!(schema.appSettings?.categorySlug || schema.appSettings?.preStart);
        this.categorySlug = schema.appSettings?.categorySlug || (schema.appSettings?.preStart ? 'pre-start' : '');
        this.categoryName = schema.appSettings?.categoryName || (schema.appSettings?.preStart ? 'Pre-Start' : '');
        this.categoryImage = schema.appSettings?.categoryImage || schema.appSettings?.preStartImage || '';
        this.categoryImageFullWidth = !!(schema.appSettings?.categoryImageFullWidth ?? schema.appSettings?.preStartImageFullWidth);
        this.categoryIcon = schema.appSettings?.categoryIcon || schema.appSettings?.preStartIcon || schema.appSettings?.formsListIconKey || '';
        this.categoryShowTitle = schema.appSettings?.categoryShowTitle !== false;
        this.categoryShowDescription = schema.appSettings?.categoryShowDescription !== false;
        this.categoryButtonText = schema.appSettings?.categoryButtonText || schema.appSettings?.preStartButtonText || '';
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
    const categorySlug = this.normalizeCategorySlug(this.categorySlug);
    if (this.categoryEnabled && !categorySlug) {
      this.saveError.set('Category slug is required when category page is enabled.');
      return;
    }
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
        categorySlug: this.categoryEnabled ? categorySlug : null,
        categoryName: this.categoryEnabled ? this.categoryName.trim() || null : null,
        categoryImage: this.categoryImage || null,
        categoryImageFullWidth: this.categoryImageFullWidth,
        categoryIcon: this.categoryIcon || null,
        categoryShowTitle: this.categoryShowTitle,
        categoryShowDescription: this.categoryShowDescription,
        categoryButtonText: this.categoryButtonText.trim() || null,
        formsListIconKey: this.categoryIcon || this.appSettings.formsListIconKey || null,
        showIconInFormsList: this.categoryEnabled,
      },
    };
    delete finalSchema.appSettings.preStart;
    delete finalSchema.appSettings.preStartImage;
    delete finalSchema.appSettings.preStartImageFullWidth;
    delete finalSchema.appSettings.preStartIcon;
    delete finalSchema.appSettings.preStartShowTitle;
    delete finalSchema.appSettings.preStartShowDescription;
    delete finalSchema.appSettings.preStartButtonText;
    delete finalSchema.appSettings.showStartOver;
    delete finalSchema.appSettings.startOverUrl;
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

  private normalizeCategorySlug(value: string): string {
    return (value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
