import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportTemplateService } from '../../../core/services/report-template.service';
import {
  ConditionGroup,
  FieldDescriptor,
  FieldDriftEntry,
  ReportColumnDefinition,
  ReportTemplate,
  SaveReportTemplateRequest,
} from '../../../core/models';
import { ReportColumnPickerComponent } from '../../../shared/components/report-column-picker/report-column-picker.component';
import { ReportFilterPanelComponent } from '../../../shared/components/report-filter-panel/report-filter-panel.component';
import { ReportDriftWizardComponent } from '../../../shared/components/report-drift-wizard/report-drift-wizard.component';

@Component({
  selector: 'app-report-designer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReportColumnPickerComponent, ReportFilterPanelComponent, ReportDriftWizardComponent],
  template: `
    <div class="flex flex-col h-full">

      <!-- Top bar -->
      <div class="sticky top-0 z-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center gap-3">
        <button type="button" (click)="goBack()"
          class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
          </svg>
        </button>

        <input
          type="text"
          [(ngModel)]="name"
          placeholder="Report name…"
          class="flex-1 min-w-0 text-lg font-semibold bg-transparent border-0 outline-none ring-0 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600"
          maxlength="120"
        />

        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Public toggle -->
          <label class="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600 dark:text-gray-300 pr-2">
            <input type="checkbox" [(ngModel)]="isPublic"
              class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"/>
            Public
          </label>

          @if (templateId()) {
            <button type="button" (click)="saveAs()" [disabled]="saving()"
              class="ta-btn ta-btn-secondary text-sm disabled:opacity-50">
              Save as New
            </button>
          }

          <button
            type="button"
            (click)="save()"
            [disabled]="saving() || !name.trim() || columns().length === 0"
            class="ta-btn ta-btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            @if (saving()) {
              <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Saving…
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
              </svg>
              Save
            }
          </button>
        </div>
      </div>

      <!-- Schema drift wizard (field-level, collapsible) -->
      @if (schemaDrift() && driftEntries().length > 0) {
        <div class="px-6 pt-4">
          <app-report-drift-wizard
            [driftEntries]="driftEntries()"
            [availableFields]="fields()"
            [columns]="columns()"
            (columnsChange)="columns.set($event)"
          />
        </div>
      } @else if (schemaDrift()) {
        <div class="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700 px-6 py-2.5 text-sm text-amber-800 dark:text-amber-300">
          <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          The form schema has changed since this template was last saved. Re-save to update the schema snapshot.
        </div>
      }

      <!-- Save error -->
      @if (saveError()) {
        <div class="ta-alert-error mx-6 mt-3">{{ saveError() }}</div>
      }

      <!-- Loading -->
      @if (loadingFields()) {
        <div class="flex-1 flex items-center justify-center">
          <div class="flex flex-col items-center gap-3 text-gray-400">
            <div class="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <span class="text-sm">Loading form fields…</span>
          </div>
        </div>
      } @else {
        <!-- Three-column layout -->
        <div class="flex-1 overflow-auto">
          <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_1fr] min-h-full divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">

            <!-- Left: Column picker -->
            <div class="p-5 overflow-y-auto">
              <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 6h18M3 14h18M3 18h18"/>
                </svg>
                Columns
              </h2>
              <app-report-column-picker
                [availableFields]="fields()"
                [selectedColumns]="columns()"
                (columnsChange)="columns.set($event)"
              />
            </div>

            <!-- Centre: Filters -->
            <div class="p-5 overflow-y-auto bg-gray-50/60 dark:bg-gray-800/30">
              <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
                </svg>
                Fixed Filters
                <span class="text-xs font-normal text-gray-400 normal-case tracking-normal">(applied to every run)</span>
              </h2>
              <app-report-filter-panel
                [fields]="fields()"
                [value]="filters()"
                label="Filter conditions"
                [collapsible]="false"
                (valueChange)="filters.set($event)"
              />
            </div>

            <!-- Right: Options -->
            <div class="p-5 overflow-y-auto">
              <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                Options
              </h2>

              <div class="flex flex-col gap-4">
                <!-- Category -->
                <div>
                  <label class="ta-field-label">Category <span class="text-gray-400 font-normal">(optional)</span></label>
                  <input type="text" [(ngModel)]="category" placeholder="e.g. Safety, Operations"
                    class="ta-field text-sm" maxlength="60"/>
                </div>

                <!-- Tags -->
                <div>
                  <label class="ta-field-label">Tags <span class="text-gray-400 font-normal">(comma separated)</span></label>
                  <input type="text" [(ngModel)]="tagsInput" placeholder="prestart, daily, safety"
                    class="ta-field text-sm" maxlength="200"/>
                </div>

                <!-- Sharing -->
                <div>
                  <label class="ta-field-label">Visible to roles</label>
                  <div class="flex flex-col gap-1.5">
                    @for (role of allRoles; track role.value) {
                      <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                        <input type="checkbox"
                          [checked]="sharedWithRoles.includes(role.value)"
                          (change)="toggleRole(role.value)"
                          class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"/>
                        {{ role.label }}
                      </label>
                    }
                  </div>
                </div>

                <!-- Description -->
                <div>
                  <label class="ta-field-label">Description <span class="text-gray-400 font-normal">(optional)</span></label>
                  <textarea
                    [(ngModel)]="description"
                    rows="3"
                    class="ta-field h-auto py-2 resize-none text-sm"
                    placeholder="What does this report show?"
                    maxlength="500"
                  ></textarea>
                </div>

                <!-- Default sort -->
                <div>
                  <label class="ta-field-label">Default Sort</label>
                  <div class="flex gap-2">
                    <select [(ngModel)]="defaultSortField" class="ta-field text-sm flex-1">
                      <option value="">Submission date (default)</option>
                      @for (col of columns(); track $index) {
                        <option [value]="col.field_key">{{ col.label }}</option>
                      }
                    </select>
                    <select [(ngModel)]="defaultSortDirection" class="ta-field text-sm w-24">
                      <option value="asc">Asc</option>
                      <option value="desc">Desc</option>
                    </select>
                  </div>
                </div>

                <!-- Page size -->
                <div>
                  <label class="ta-field-label">Default Page Size</label>
                  <select [(ngModel)]="defaultPageSize" class="ta-field text-sm">
                    <option [value]="10">10 rows</option>
                    <option [value]="25">25 rows</option>
                    <option [value]="50">50 rows</option>
                    <option [value]="100">100 rows</option>
                  </select>
                </div>

                <!-- Summary card -->
                @if (columns().length > 0) {
                  <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                    <span><strong class="text-gray-700 dark:text-gray-200">{{ columns().length }}</strong> column{{ columns().length !== 1 ? 's' : '' }}</span>
                    @if (filters() && filters()!.children.length > 0) {
                      <span><strong class="text-gray-700 dark:text-gray-200">{{ filters()!.children.length }}</strong> fixed filter{{ filters()!.children.length !== 1 ? 's' : '' }}</span>
                    }
                    <span>Page size: <strong class="text-gray-700 dark:text-gray-200">{{ defaultPageSize }}</strong></span>
                  </div>
                }
              </div>
            </div>

          </div>
        </div>
      }
    </div>
  `,
})
export class ReportDesignerComponent implements OnInit {
  private reportService = inject(ReportTemplateService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  formId = signal(0);
  templateId = signal<number | null>(null);
  fields = signal<FieldDescriptor[]>([]);
  columns = signal<ReportColumnDefinition[]>([]);
  filters = signal<ConditionGroup | null>(null);
  driftEntries = signal<FieldDriftEntry[]>([]);
  loadingFields = signal(true);
  saving = signal(false);
  saveError = signal('');
  schemaDrift = signal(false);

  name = '';
  description = '';
  isPublic = false;
  defaultSortField = '';
  defaultSortDirection: 'asc' | 'desc' = 'asc';
  defaultPageSize = 25;
  category = '';
  tagsInput = '';
  sharedWithRoles: string[] = [];

  readonly allRoles = [
    { value: 'admin', label: 'Admin' },
    { value: 'editor', label: 'Editor' },
    { value: 'viewer', label: 'Viewer' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'operator', label: 'Operator' },
  ];

  ngOnInit(): void {
    const fid = +this.route.snapshot.paramMap.get('formId')!;
    const tid = this.route.snapshot.queryParamMap.get('templateId');
    this.formId.set(fid);

    this.reportService.getFormFields(fid).subscribe({
      next: fields => {
        this.fields.set(fields);
        this.loadingFields.set(false);
        if (tid) this.loadTemplate(+tid);
      },
      error: () => this.loadingFields.set(false),
    });
  }

  loadTemplate(id: number): void {
    this.templateId.set(id);
    this.reportService.get(id).subscribe({
      next: t => {
        this.name = t.name;
        this.description = t.description ?? '';
        this.isPublic = t.is_public;
        this.columns.set(t.columns ?? []);
        this.filters.set(t.filters ?? null);
        this.defaultSortField = t.default_sort_field ?? '';
        this.defaultSortDirection = t.default_sort_direction ?? 'asc';
        this.defaultPageSize = t.default_page_size ?? 25;
        this.schemaDrift.set(t.has_schema_drift);
        this.driftEntries.set(t.field_drift ?? []);
        this.category = t.category ?? '';
        this.tagsInput = (t.tags ?? []).join(', ');
        this.sharedWithRoles = [...(t.shared_with_roles ?? [])];
      },
    });
  }

  save(): void { this.performSave(false); }
  saveAs(): void { this.performSave(true); }

  private performSave(forceNew: boolean): void {
    if (this.saving() || !this.name.trim() || this.columns().length === 0) return;
    this.saving.set(true);
    this.saveError.set('');

    const tags = this.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const req: SaveReportTemplateRequest = {
      form_id: this.formId(),
      name: this.name.trim(),
      description: this.description.trim() || undefined,
      is_public: this.isPublic,
      columns: this.columns(),
      filters: this.filters(),
      default_sort_field: this.defaultSortField || undefined,
      default_sort_direction: this.defaultSortDirection,
      default_page_size: this.defaultPageSize,
      display_mode: 'table',
      tags,
      category: this.category.trim() || undefined,
      shared_with_roles: this.sharedWithRoles,
    };

    const isEdit = !forceNew && this.templateId() != null;
    const obs = isEdit
      ? this.reportService.update(this.templateId()!, req)
      : this.reportService.create(req);

    obs.subscribe({
      next: t => {
        this.saving.set(false);
        this.schemaDrift.set(false);
        this.router.navigate(['/admin/reports', t.id, 'run']);
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set('Failed to save report template. Please try again.');
      },
    });
  }

  toggleRole(role: string): void {
    if (this.sharedWithRoles.includes(role))
      this.sharedWithRoles = this.sharedWithRoles.filter(r => r !== role);
    else
      this.sharedWithRoles = [...this.sharedWithRoles, role];
  }

  goBack(): void {
    this.router.navigate(['/admin/reports']);
  }
}
