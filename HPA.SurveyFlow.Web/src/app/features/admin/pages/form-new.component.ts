import { Component, OnInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FormService } from '../../../core/services/form.service';
import { UserService } from '../../../core/services/user.service';
import { ToastrService } from 'ngx-toastr';
import { FormEditorComponent } from '../../../shared/components/formio/form-editor.component';
import { IntegrationPayloadMappingComponent } from '../../../shared/components/integration-payload-mapping/integration-payload-mapping.component';
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
  imports: [CommonModule, FormsModule, FormEditorComponent, IntegrationPayloadMappingComponent],
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
        <h1 class="text-2xl font-bold text-gray-900">New Form</h1>
      </div>

      @if (error()) {
        <div class="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{{ error() }}</div>
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
            @for (f of allForms(); track f.id) {
              <option [ngValue]="f.id">{{ f.name }}</option>
            }
          </select>
          <p class="mt-1 text-xs text-gray-500">Use this when this form is shown after another form is submitted.</p>
        </div>
      </div>

      <!-- Access control -->
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
          <label class="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" [(ngModel)]="categoryEnabled"
              class="h-4 w-4 rounded border-gray-300 text-indigo-600"/>
            <span class="text-sm text-gray-700">Show on a category page</span>
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
          }
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Public description</label>
            <textarea [(ngModel)]="appSettings.publicDescription" rows="2"
              placeholder="Shown to users on the forms list page"
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
                    @for (f of allForms(); track f.id) {
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

      <!-- Wizard toggle -->
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
                [class]="activePageIndex() === i ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'">
                <button type="button" (click)="selectPage(i)" class="text-sm"
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
    </div>
  `,
})
export class FormNewComponent implements OnInit {
  @ViewChild('editorRef') editorRef!: FormEditorComponent;

  router = inject(Router);
  private formService = inject(FormService);
  private userService = inject(UserService);
  private toastr = inject(ToastrService);

  name = '';
  allowAnonymous = false;
  visibility = 'public';
  parentFormId: number | null = null;
  formDisplay: 'form' | 'wizard' = 'form';
  allowedRoles: string[] = [];
  allowedUserIds: number[] = [];
  appSettings: any = { nextForms: { success: null, warning: null, error: null } };
  categoryEnabled = false;
  categorySlug = '';
  categoryName = '';
  placeholderHelp = 'Available placeholders: {{outcome}}, {{submission_id}}, {{form_name}}, {{user_email}}, {{error_count}}, {{warning_count}}, {{abnormal_questions}}, {{error_questions}}, {{warning_questions}}, {{abnormal_answers}}, {{error_answers}}, {{warning_answers}}.';
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

  saving = signal(false);
  error = signal<string | null>(null);
  usersLoading = signal(false);
  allUsers = signal<User[]>([]);
  allForms = signal<Form[]>([]);
  wizardPanels = signal<WizardPanel[]>([]);
  activePageIndex = signal(0);

  availableRoles = [
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
  ];

  ngOnInit(): void {
    this.userService.list().subscribe({
      next: (u) => { this.allUsers.set(u); this.usersLoading.set(false); },
      error: () => this.usersLoading.set(false),
    });
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

  selectPage(i: number): void { this.activePageIndex.set(i); }

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
    this.activePageIndex.set(Math.max(0, Math.min(this.activePageIndex(), comps.length - 1)));
  }

  renamePage(i: number): void {
    const current = this.wizardPanels()[i]?.title ?? `Page ${i + 1}`;
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
    if (!this.name.trim()) { this.error.set('Form name is required.'); return; }
    const categorySlug = this.normalizeCategorySlug(this.categorySlug);
    if (this.categoryEnabled && !categorySlug) {
      this.error.set('Category slug is required when category page is enabled.');
      return;
    }
    this.error.set(null);
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
      error: (err) => { this.saving.set(false); this.error.set(err?.error?.error || 'Failed to create form.'); this.toastr.error(this.error()!); },
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
