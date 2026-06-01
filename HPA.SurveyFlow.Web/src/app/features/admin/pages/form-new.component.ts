import { Component, OnInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormService } from '../../../core/services/form.service';
import { UserService } from '../../../core/services/user.service';
import { CategoryService } from '../../../core/services/category.service';
import { ToastrService } from 'ngx-toastr';
import { FormEditorComponent } from '../../../shared/components/formio/form-editor.component';
import { IntegrationPayloadMappingComponent } from '../../../shared/components/integration-payload-mapping/integration-payload-mapping.component';
import { HelpTriggerComponent } from '../../../shared/help/help-trigger.component';
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

function defaultSecondarySubmitConfig(): SecondarySubmitConfig {
  return { enabled: false, integration: 'mex', action: 'create_request' };
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
  if (comps.some((c: any) => c?.type === 'panel')) return schema;
  return {
    ...schema,
    components: [{
      type: 'panel', breadcrumb: 'Page 1', title: 'Page 1',
      label: 'Page 1', key: 'page1', components: comps,
    }],
  };
}

@Component({
  selector: 'app-admin-form-new',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FormEditorComponent, IntegrationPayloadMappingComponent, HelpTriggerComponent],
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
        <h1 class="text-2xl font-bold text-gray-900">New Form</h1>
      </div>

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
              @for (f of allForms(); track f.id) {
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

          <!-- Form Settings checkboxes -->
          <div class="border-t pt-4">
            <p class="flex items-center gap-1 text-sm font-semibold text-gray-700 mb-3">Form Settings</p>
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

          <!-- Category -->
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
          </div>

        </div>
      </div>

      <!-- ── 2. Submission Flow (collapsible) ────────────────────────────── -->
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
                      @for (f of allForms(); track f.id) {
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

      <!-- ── 3. Form Builder (collapsible) ───────────────────────────────── -->
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

      <!-- Post-create hint -->
      <div class="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <strong class="font-semibold">After saving</strong>, you'll be able to configure the card image &amp; icon, notification rules, and integration rules — these settings become available once the form has been created.
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
          } @else { Create Form }
        </button>
        <button type="button" (click)="router.navigate(['/admin/forms'])"
          class="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition">
          Cancel
        </button>
      </div>
    </div>
  `,
})
export class FormNewComponent implements OnInit {
  @ViewChild('editorRef') editorRef!: FormEditorComponent;

  router = inject(Router);
  private formService = inject(FormService);
  private userService = inject(UserService);
  private categoryService = inject(CategoryService);
  private toastr = inject(ToastrService);

  name = '';
  allowAnonymous = false;
  visibility = 'public';
  parentFormId: number | null = null;
  formDisplay: 'form' | 'wizard' = 'form';
  allowedRoles: string[] = [];
  allowedUserIds: number[] = [];
  categorySlug = '';
  appSettings: any = { nextForms: { success: null, warning: null, error: null } };
  secondarySubmitOutcomes = SECONDARY_SUBMIT_OUTCOMES;
  secondarySubmitConfigs: Record<SecondarySubmitOutcome, SecondarySubmitConfig> = {
    success: defaultSecondarySubmitConfig(),
    warning: defaultSecondarySubmitConfig(),
    error: defaultSecondarySubmitConfig(),
  };
  resultActions: Record<SecondarySubmitOutcome, ResultActionConfig> = {
    success: defaultResultActionConfig(),
    warning: defaultResultActionConfig(),
    error: defaultResultActionConfig(),
  };
  emailNotifications: Record<SecondarySubmitOutcome, EmailNotificationConfig> = normalizeEmailNotificationConfig(null);
  currentSchema: any = { type: 'form', display: 'form', components: [] };

  sectionOpen: Record<string, boolean> = {
    flow: false,
    builder: true,
  };

  saving = signal(false);
  saveError = signal<string | null>(null);
  usersLoading = signal(false);
  allUsers = signal<User[]>([]);
  allForms = signal<Form[]>([]);
  availableRoles = signal<{ value: string; label: string }[]>([
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
  ]);
  availableCategories = signal<{ slug: string; name: string }[]>([]);
  wizardPanels = signal<WizardPanel[]>([]);

  ngOnInit(): void {
    this.usersLoading.set(true);
    this.userService.list().subscribe({
      next: (u) => { this.allUsers.set(u); this.usersLoading.set(false); },
      error: () => this.usersLoading.set(false),
    });
    this.formService.list().subscribe({
      next: (forms) => this.allForms.set(forms),
      error: () => {},
    });
    this.userService.getRoles().subscribe({
      next: (roles) => this.availableRoles.set(
        roles.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) }))
      ),
      error: () => {},
    });
    this.categoryService.list().subscribe({
      next: (cats) => this.availableCategories.set(cats.map(c => ({ slug: c.slug, name: c.name }))),
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
      },
    };
    this.saving.set(true);
    this.formService.create({
      name: this.name.trim(),
      json: finalSchema,
      allow_anonymous_submit: this.allowAnonymous ? 1 : 0,
      visibility: this.visibility,
      parent_form_id: this.parentFormId,
      allowed_roles: this.allowedRoles,
      allowed_user_ids: this.allowedUserIds,
    }).subscribe({
      next: () => { this.toastr.success('Form created.'); this.router.navigate(['/admin/forms']); },
      error: (err) => { this.saving.set(false); this.saveError.set(err?.error?.error || 'Failed to create form.'); this.toastr.error(this.saveError()!); },
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
}
