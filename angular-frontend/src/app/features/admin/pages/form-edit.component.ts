import { Component, OnInit, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { FormService } from '../../../core/services/form.service';
import { UserService } from '../../../core/services/user.service';
import { ToastrService } from 'ngx-toastr';
import { FormEditorComponent } from '../../../shared/components/formio/form-editor.component';
import { Form, User } from '../../../core/models';

type WizardPanel = { key: string; title: string };

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
  imports: [CommonModule, FormsModule, FormEditorComponent],
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
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Public description</label>
              <textarea [(ngModel)]="appSettings.publicDescription" rows="2" placeholder="Shown to users on the forms list page"
                class="w-full max-w-lg rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
            </div>
          </div>
        </div>

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
        @if (formDisplay === 'wizard') {
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

  form = signal<Form | null>(null);
  loading = signal(true);
  loadError = signal<string | null>(null);
  saving = signal(false);
  saveError = signal<string | null>(null);
  usersLoading = signal(false);
  allUsers = signal<User[]>([]);
  wizardPanels = signal<WizardPanel[]>([]);
  activePageIndex = signal(0);

  name = '';
  allowAnonymous = false;
  visibility = 'public';
  formDisplay: 'form' | 'wizard' = 'form';
  allowedRoles: string[] = [];
  allowedUserIds: number[] = [];
  appSettings: any = {};
  currentSchema: any = {};

  availableRoles = [
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
  ];

  private formId!: number;

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
        this.allowedRoles = f.allowed_roles ?? [];
        this.allowedUserIds = f.allowed_user_ids ?? [];
        let schema = f.json ?? {};
        if (typeof schema === 'string') { try { schema = JSON.parse(schema); } catch { schema = {}; } }
        this.appSettings = { ...(schema.appSettings ?? {}) };
        this.formDisplay = schema.display === 'wizard' ? 'wizard' : 'form';
        this.currentSchema = schema;
        this.wizardPanels.set(getPanels(schema));
        this.loading.set(false);
      },
      error: (err) => { this.loadError.set(err?.error?.error || 'Failed to load form.'); this.loading.set(false); },
    });
    this.loadUsers();
  }

  private loadUsers(): void {
    this.usersLoading.set(true);
    this.userService.list().subscribe({
      next: (u) => { this.allUsers.set(u); this.usersLoading.set(false); },
      error: () => this.usersLoading.set(false),
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

  save(): void {
    if (!this.name.trim()) { this.saveError.set('Form name is required.'); return; }
    this.saveError.set(null);
    const schema = this.editorRef ? this.editorRef.getSchema() : this.currentSchema;
    const finalSchema = { ...schema, display: this.formDisplay, appSettings: { ...this.appSettings } };
    this.saving.set(true);
    this.formService.update(this.formId, {
      name: this.name.trim(),
      json: finalSchema,
      allow_anonymous_submit: this.allowAnonymous ? 1 : 0,
      visibility: this.visibility,
      allowed_roles: this.allowedRoles,
      allowed_user_ids: this.allowedUserIds,
    }).subscribe({
      next: () => { this.toastr.success('Form updated.'); this.router.navigate(['/admin/forms']); },
      error: (err) => { this.saving.set(false); this.saveError.set(err?.error?.error || 'Failed to update form.'); this.toastr.error(this.saveError()!); },
    });
  }
}
