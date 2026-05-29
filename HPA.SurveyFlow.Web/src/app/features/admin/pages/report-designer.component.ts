import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ReportTemplateService } from '../../../core/services/report-template.service';
import { ScheduledReportService } from '../../../core/services/scheduled-report.service';
import { ReportAlertService } from '../../../core/services/report-alert.service';
import {
  ChartConfig,
  ChartTypeName,
  ConditionGroup,
  FieldDescriptor,
  FieldDriftEntry,
  GroupByDef,
  MeasureDef,
  ReportColumnDefinition,
  ReportTemplate,
  SaveReportTemplateRequest,
  ScheduledReport,
  SaveScheduledReportRequest,
  ReportAlert,
  SaveReportAlertRequest,
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
          <div class="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr_1fr_1fr] min-h-full divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">

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

            <!-- Centre-right: Aggregation (GROUP BY + Measures) -->
            <div class="p-5 overflow-y-auto">
              <!-- Collapsible header -->
              <button type="button" (click)="aggPanelOpen = !aggPanelOpen"
                class="w-full flex items-center justify-between mb-3 group">
                <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                  <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                  Aggregation
                  <span class="text-xs font-normal text-gray-400 normal-case tracking-normal">(optional)</span>
                </h2>
                <svg class="w-4 h-4 text-gray-400 transition-transform" [class.rotate-180]="aggPanelOpen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              @if (aggPanelOpen) {
                <div class="flex flex-col gap-4">
                  <!-- GROUP BY -->
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Group By Dimensions</span>
                      <button type="button" (click)="addGroupBy()" class="text-xs text-brand-600 hover:text-brand-800 font-medium">+ Add</button>
                    </div>
                    @if (groupByDefs.length === 0) {
                      <p class="text-xs text-gray-400 italic">No grouping — shows raw rows</p>
                    }
                    @for (g of groupByDefs; track $index; let i = $index) {
                      <div class="flex items-center gap-2 mb-2">
                        <select [(ngModel)]="g.field_key" (ngModelChange)="onGroupByFieldChange(i)" class="ta-field text-xs flex-1 h-8 py-0">
                          <option value="">— pick field —</option>
                          @for (f of fields(); track f.key) {
                            <option [value]="f.key">{{ f.label }}</option>
                          }
                        </select>
                        @if (fieldType(g.field_key) === 'date') {
                          <select [(ngModel)]="g.date_trunc" class="ta-field text-xs w-24 h-8 py-0">
                            <option value="">Raw</option>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="month">Month</option>
                            <option value="quarter">Quarter</option>
                            <option value="year">Year</option>
                          </select>
                        }
                        <button type="button" (click)="removeGroupBy(i)" class="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    }
                  </div>

                  <!-- MEASURES -->
                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <span class="text-xs font-medium text-gray-600 dark:text-gray-300">Measures</span>
                      <button type="button" (click)="addMeasure()" class="text-xs text-brand-600 hover:text-brand-800 font-medium">+ Add</button>
                    </div>
                    @if (measureDefs.length === 0) {
                      <p class="text-xs text-gray-400 italic">Add measures to aggregate values</p>
                    }
                    @for (m of measureDefs; track $index; let i = $index) {
                      <div class="flex items-center gap-2 mb-2">
                        <select [(ngModel)]="m.aggregation" class="ta-field text-xs w-24 h-8 py-0">
                          <option value="count">Count</option>
                          <option value="sum">Sum</option>
                          <option value="avg">Avg</option>
                          <option value="min">Min</option>
                          <option value="max">Max</option>
                        </select>
                        @if (m.aggregation !== 'count') {
                          <select [(ngModel)]="m.field_key" class="ta-field text-xs flex-1 h-8 py-0">
                            <option value="">— pick field —</option>
                            @for (f of fields(); track f.key) {
                              <option [value]="f.key">{{ f.label }}</option>
                            }
                          </select>
                        } @else {
                          <span class="text-xs text-gray-400 flex-1 italic">All rows</span>
                        }
                        <input type="text" [(ngModel)]="m.label" placeholder="Label" class="ta-field text-xs w-24 h-8 py-0"/>
                        <button type="button" (click)="removeMeasure(i)" class="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    }
                  </div>

                  @if (groupByDefs.length > 0 || measureDefs.length > 0) {
                    <p class="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                      When aggregation is configured, column definitions above are used for display labels only. Query results are grouped.
                    </p>
                  }
                </div>
              }
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

                <!-- Chart type -->
                <div>
                  <label class="ta-field-label">Chart Type</label>
                  <select [(ngModel)]="chartType" class="ta-field text-sm">
                    <option value="table">Table only (no chart)</option>
                    <option value="bar">Bar chart</option>
                    <option value="line">Line chart</option>
                    <option value="pie">Pie chart</option>
                    <option value="doughnut">Doughnut chart</option>
                    <option value="number_card">Number cards</option>
                  </select>
                </div>

                <!-- Axis mapping (shown when chart is selected) -->
                @if (chartType !== 'table') {
                  <div class="flex flex-col gap-2 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50/40 dark:bg-brand-900/10 p-3">
                    <span class="text-xs font-medium text-brand-700 dark:text-brand-300">Axis Mapping</span>

                    @if (chartType !== 'number_card') {
                      <!-- X-axis: pick from aggregation aliases or columns -->
                      <div>
                        <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">X-axis / Label</label>
                        <select [(ngModel)]="chartXAxis" class="ta-field text-xs h-8 py-0">
                          <option value="">Auto (first column)</option>
                          @for (a of chartAxisOptions(); track a.alias) {
                            <option [value]="a.alias">{{ a.label }}</option>
                          }
                        </select>
                      </div>
                    }

                    <!-- Y-axes: multi-select via checkboxes -->
                    <div>
                      <label class="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                        {{ chartType === 'number_card' ? 'Values to show' : 'Y-axis series' }}
                      </label>
                      <div class="flex flex-col gap-1">
                        @for (a of chartAxisOptions(); track a.alias) {
                          <label class="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                            <input type="checkbox"
                              [checked]="chartYAxes.includes(a.alias)"
                              (change)="toggleYAxis(a.alias)"
                              class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"/>
                            {{ a.label }}
                          </label>
                        }
                      </div>
                    </div>
                  </div>
                }

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

                <!-- Schedules section (only visible when editing an existing template) -->
                @if (templateId()) {
                  <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" (click)="schedulesPanelOpen = !schedulesPanelOpen"
                      class="w-full flex items-center justify-between mb-3 group">
                      <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                        <svg class="w-4 h-4 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        Schedules
                        <span class="text-xs font-normal text-gray-400 normal-case tracking-normal">(email delivery)</span>
                      </h2>
                      <svg class="w-4 h-4 text-gray-400 transition-transform" [class.rotate-180]="schedulesPanelOpen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>

                    @if (schedulesPanelOpen) {
                      <div class="flex flex-col gap-3">
                        @if (schedulesLoading()) {
                          <div class="text-xs text-gray-400 italic">Loading schedules…</div>
                        }
                        @for (s of schedules(); track s.id) {
                          <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 flex flex-col gap-1.5 text-xs">
                            <div class="flex items-center justify-between gap-2">
                              <span class="font-medium text-gray-800 dark:text-gray-200 truncate">{{ s.name }}</span>
                              <span [class]="s.is_enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'">
                                {{ s.is_enabled ? 'Enabled' : 'Disabled' }}
                              </span>
                            </div>
                            <div class="text-gray-500 dark:text-gray-400 font-mono">{{ s.cron_expression }}</div>
                            <div class="text-gray-400 truncate">{{ s.recipients }}</div>
                            @if (s.last_run_status) {
                              <div [class]="'text-xs ' + (s.last_run_status === 'success' ? 'text-green-500' : s.last_run_status === 'failed' ? 'text-red-500' : 'text-gray-400')">
                                Last: {{ s.last_run_status }} {{ s.last_run_at | date:'short' }}
                              </div>
                            }
                            <div class="flex gap-1.5 mt-1">
                              <button type="button" (click)="editSchedule(s)"
                                class="ta-btn ta-btn-secondary text-xs h-7 px-2 flex-1">Edit</button>
                              <button type="button" (click)="runScheduleNow(s)"
                                class="ta-btn ta-btn-secondary text-xs h-7 px-2"
                                title="Send now">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                </svg>
                              </button>
                              <button type="button" (click)="deleteSchedule(s)"
                                class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        }

                        <button type="button" (click)="openNewSchedule()"
                          class="ta-btn ta-btn-secondary text-xs h-8 w-full">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                          </svg>
                          Add Schedule
                        </button>
                      </div>
                    }
                  </div>
                }

                <!-- Alerts section (only visible when editing an existing template) -->
                @if (templateId()) {
                  <div class="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <button type="button" (click)="toggleAlertsPanel()"
                      class="w-full flex items-center justify-between mb-3 group">
                      <h2 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-2">
                        <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
                        </svg>
                        Alerts
                        <span class="text-xs font-normal text-gray-400 normal-case tracking-normal">(threshold notifications)</span>
                      </h2>
                      <svg class="w-4 h-4 text-gray-400 transition-transform" [class.rotate-180]="alertsPanelOpen" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>

                    @if (alertsPanelOpen) {
                      <div class="flex flex-col gap-3">
                        @if (alertsLoading()) {
                          <div class="text-xs text-gray-400 italic">Loading alerts…</div>
                        }
                        @for (a of alerts(); track a.id) {
                          <div class="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 flex flex-col gap-1.5 text-xs">
                            <div class="flex items-center justify-between gap-2">
                              <span class="font-medium text-gray-800 dark:text-gray-200 truncate">{{ a.name }}</span>
                              <span [class]="a.is_enabled ? 'text-green-600 dark:text-green-400' : 'text-gray-400'">
                                {{ a.is_enabled ? 'Enabled' : 'Disabled' }}
                              </span>
                            </div>
                            <div class="text-gray-500 dark:text-gray-400">
                              {{ a.condition_field }} {{ a.condition_operator }} {{ a.threshold }}
                            </div>
                            <div class="font-mono text-gray-400">{{ a.evaluation_cron }}</div>
                            @if (a.last_status) {
                              <div [class]="'text-xs ' + (a.last_status === 'triggered' ? 'text-red-500' : a.last_status === 'ok' ? 'text-green-500' : 'text-gray-400')">
                                Last: {{ a.last_status }} {{ a.last_evaluated_at | date:'short' }}
                              </div>
                            }
                            <div class="flex gap-1.5 mt-1">
                              <button type="button" (click)="editAlert(a)"
                                class="ta-btn ta-btn-secondary text-xs h-7 px-2 flex-1">Edit</button>
                              <button type="button" (click)="triggerAlertNow(a)"
                                class="ta-btn ta-btn-secondary text-xs h-7 px-2"
                                title="Evaluate now">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                                </svg>
                              </button>
                              <button type="button" (click)="deleteAlert(a)"
                                class="inline-flex items-center justify-center w-7 h-7 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </div>
                          </div>
                        }

                        <button type="button" (click)="openNewAlert()"
                          class="ta-btn ta-btn-secondary text-xs h-8 w-full">
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                          </svg>
                          Add Alert
                        </button>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>

          </div>
        </div>
      }
    </div>

    <!-- Schedule edit modal -->
    @if (editingSchedule()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div class="ta-card w-full max-w-md shadow-xl flex flex-col gap-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ editingScheduleId() ? 'Edit Schedule' : 'New Schedule' }}
          </h3>
          @if (scheduleError()) {
            <div class="ta-alert-error">{{ scheduleError() }}</div>
          }
          <div class="flex flex-col gap-3">
            <label class="ta-label">
              Name <span class="text-red-500">*</span>
              <input type="text" [(ngModel)]="scheduleForm.name" class="ta-field mt-1" placeholder="e.g. Weekly Safety Summary"/>
            </label>
            <label class="ta-label">
              Cron Expression <span class="text-red-500">*</span>
              <input type="text" [(ngModel)]="scheduleForm.cron_expression" class="ta-field mt-1 font-mono text-sm" placeholder="0 8 * * 1"/>
              <span class="text-xs text-gray-400 mt-0.5 block">5-part cron (min hr dom month dow). Example: every Monday at 8am → <code>0 8 * * 1</code></span>
            </label>
            <label class="ta-label">
              Recipients <span class="text-red-500">*</span>
              <input type="text" [(ngModel)]="scheduleForm.recipients" class="ta-field mt-1" placeholder="a@b.com, c@d.com"/>
              <span class="text-xs text-gray-400 mt-0.5 block">Comma-separated email addresses</span>
            </label>
            <label class="ta-label">
              Email Subject
              <input type="text" [(ngModel)]="scheduleForm.subject" class="ta-field mt-1"/>
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" [(ngModel)]="scheduleForm.is_enabled" class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"/>
              Enabled
            </label>
          </div>
          <div class="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button" (click)="editingSchedule.set(false)" class="ta-btn ta-btn-secondary text-sm">Cancel</button>
            <button type="button" (click)="saveSchedule()"
              [disabled]="savingSchedule() || !scheduleForm.name.trim() || !scheduleForm.cron_expression.trim() || !scheduleForm.recipients.trim()"
              class="ta-btn ta-btn-primary text-sm disabled:opacity-50">
              {{ savingSchedule() ? 'Saving…' : (editingScheduleId() ? 'Update' : 'Create') }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- Alert edit modal -->
    @if (editingAlert()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div class="ta-card w-full max-w-md shadow-xl flex flex-col gap-4">
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ editingAlertId() ? 'Edit Alert' : 'New Alert' }}
          </h3>
          @if (alertError()) {
            <div class="ta-alert-error">{{ alertError() }}</div>
          }
          <div class="flex flex-col gap-3">
            <label class="ta-label">
              Name <span class="text-red-500">*</span>
              <input type="text" [(ngModel)]="alertForm.name" class="ta-field mt-1" placeholder="e.g. High submission count"/>
            </label>
            <label class="ta-label">
              Condition Field <span class="text-red-500">*</span>
              <input type="text" [(ngModel)]="alertForm.condition_field" class="ta-field mt-1 font-mono text-sm" placeholder="e.g. count"/>
            </label>
            <div class="flex gap-2">
              <label class="ta-label flex-1">
                Operator <span class="text-red-500">*</span>
                <select [(ngModel)]="alertForm.condition_operator" class="ta-field mt-1">
                  <option value="gt">&gt; greater than</option>
                  <option value="gte">&gt;= greater or equal</option>
                  <option value="lt">&lt; less than</option>
                  <option value="lte">&lt;= less or equal</option>
                  <option value="eq">= equal</option>
                  <option value="neq">≠ not equal</option>
                </select>
              </label>
              <label class="ta-label flex-1">
                Threshold <span class="text-red-500">*</span>
                <input type="number" [(ngModel)]="alertForm.threshold" class="ta-field mt-1"/>
              </label>
            </div>
            <label class="ta-label">
              Evaluation Cron <span class="text-red-500">*</span>
              <input type="text" [(ngModel)]="alertForm.evaluation_cron" class="ta-field mt-1 font-mono text-sm" placeholder="0 * * * *"/>
              <span class="text-xs text-gray-400 mt-0.5 block">5-part cron. Example: every hour → <code>0 * * * *</code></span>
            </label>
            <label class="ta-label">
              Recipients
              <input type="text" [(ngModel)]="alertForm.recipients" class="ta-field mt-1" placeholder="a@b.com, c@d.com"/>
              <span class="text-xs text-gray-400 mt-0.5 block">Comma-separated email addresses (optional)</span>
            </label>
            <label class="ta-label">
              Webhook URL
              <input type="url" [(ngModel)]="alertForm.webhook_url" class="ta-field mt-1" placeholder="https://…"/>
            </label>
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input type="checkbox" [(ngModel)]="alertForm.is_enabled" class="rounded border-gray-300 text-brand-600 focus:ring-brand-500"/>
              Enabled
            </label>
          </div>
          <div class="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
            <button type="button" (click)="editingAlert.set(false)" class="ta-btn ta-btn-secondary text-sm">Cancel</button>
            <button type="button" (click)="saveAlert()"
              [disabled]="savingAlert() || !alertForm.name.trim() || !alertForm.condition_field.trim() || !alertForm.evaluation_cron.trim()"
              class="ta-btn ta-btn-primary text-sm disabled:opacity-50">
              {{ savingAlert() ? 'Saving…' : (editingAlertId() ? 'Update' : 'Create') }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ReportDesignerComponent implements OnInit {
  private reportService = inject(ReportTemplateService);
  private scheduleService = inject(ScheduledReportService);
  private alertService = inject(ReportAlertService);
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
  groupByDefs: GroupByDef[] = [];
  measureDefs: MeasureDef[] = [];
  aggPanelOpen = false;
  schedulesPanelOpen = false;
  alertsPanelOpen = false;
  chartType: ChartTypeName = 'table';
  chartXAxis = '';
  chartYAxes: string[] = [];

  schedules = signal<ScheduledReport[]>([]);
  schedulesLoading = signal(false);
  editingSchedule = signal(false);
  editingScheduleId = signal<number | null>(null);
  savingSchedule = signal(false);
  scheduleError = signal('');
  scheduleForm: SaveScheduledReportRequest = {
    report_template_id: 0,
    name: '',
    cron_expression: '',
    recipients: '',
    subject: '{{ReportName}} — {{RunDate}}',
    is_enabled: true,
  };

  alerts = signal<ReportAlert[]>([]);
  alertsLoading = signal(false);
  editingAlert = signal(false);
  editingAlertId = signal<number | null>(null);
  savingAlert = signal(false);
  alertError = signal('');
  alertForm: SaveReportAlertRequest = {
    report_template_id: 0,
    name: '',
    condition_field: 'count',
    condition_operator: 'gt',
    threshold: 0,
    evaluation_cron: '0 * * * *',
    recipients: '',
    webhook_url: null,
    is_enabled: true,
  };

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
        this.groupByDefs = t.group_by ? [...t.group_by] : [];
        this.measureDefs = t.measures ? [...t.measures] : [];
        if (this.groupByDefs.length > 0 || this.measureDefs.length > 0) this.aggPanelOpen = true;
        this.chartType = (t.chart_type as ChartTypeName) ?? 'table';
        this.chartXAxis = t.chart_config?.x_axis ?? '';
        this.chartYAxes = t.chart_config?.y_axes ? [...t.chart_config.y_axes] : [];
        this.loadSchedules();
        this.loadAlerts();
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
      group_by: this.groupByDefs.length > 0 ? this.groupByDefs : null,
      measures: this.measureDefs.length > 0 ? this.measureDefs : null,
      chart_type: this.chartType,
      chart_config: this.chartType !== 'table' ? this.buildChartConfig() : null,
      dataset_id: null,
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

  addGroupBy(): void {
    this.groupByDefs = [...this.groupByDefs, { field_key: '', label: '', alias: `dim${this.groupByDefs.length + 1}`, date_trunc: null }];
  }

  onGroupByFieldChange(index: number): void {
    const g = this.groupByDefs[index];
    const field = this.fields().find(f => f.key === g.field_key);
    if (field) {
      g.label = field.label;
      g.alias = field.key;
    }
  }

  removeGroupBy(index: number): void {
    this.groupByDefs = this.groupByDefs.filter((_, i) => i !== index);
  }

  addMeasure(): void {
    this.measureDefs = [...this.measureDefs, { field_key: undefined, label: 'Count', aggregation: 'count' }];
  }

  removeMeasure(index: number): void {
    this.measureDefs = this.measureDefs.filter((_, i) => i !== index);
  }

  fieldType(key: string): string {
    return this.fields().find(f => f.key === key)?.type ?? 'text';
  }

  // Returns alias+label options for chart axis pickers:
  // aggregation aliases take priority; otherwise fall back to selected columns
  chartAxisOptions(): { alias: string; label: string }[] {
    if (this.groupByDefs.length > 0 || this.measureDefs.length > 0) {
      const dims = this.groupByDefs.filter(g => g.alias).map(g => ({ alias: g.alias, label: g.label || g.alias }));
      const measures = this.measureDefs.map(m => ({ alias: m.alias || m.label, label: m.label }));
      return [...dims, ...measures];
    }
    return this.columns().map(c => ({ alias: c.field_key, label: c.label }));
  }

  toggleYAxis(alias: string): void {
    if (this.chartYAxes.includes(alias))
      this.chartYAxes = this.chartYAxes.filter(a => a !== alias);
    else
      this.chartYAxes = [...this.chartYAxes, alias];
  }

  private buildChartConfig(): ChartConfig {
    const cfg: ChartConfig = {};
    if (this.chartXAxis) cfg.x_axis = this.chartXAxis;
    if (this.chartYAxes.length > 0) cfg.y_axes = [...this.chartYAxes];
    return cfg;
  }

  loadSchedules(): void {
    const tid = this.templateId();
    if (!tid) return;
    this.schedulesLoading.set(true);
    this.scheduleService.list(tid).subscribe({
      next: s => { this.schedules.set(s); this.schedulesLoading.set(false); },
      error: () => this.schedulesLoading.set(false),
    });
  }

  openNewSchedule(): void {
    this.scheduleForm = {
      report_template_id: this.templateId()!,
      name: '',
      cron_expression: '',
      recipients: '',
      subject: '{{ReportName}} — {{RunDate}}',
      is_enabled: true,
    };
    this.editingScheduleId.set(null);
    this.scheduleError.set('');
    this.editingSchedule.set(true);
  }

  editSchedule(s: ScheduledReport): void {
    this.scheduleForm = {
      report_template_id: s.report_template_id,
      name: s.name,
      cron_expression: s.cron_expression,
      recipients: s.recipients,
      subject: s.subject,
      is_enabled: s.is_enabled,
    };
    this.editingScheduleId.set(s.id);
    this.scheduleError.set('');
    this.editingSchedule.set(true);
  }

  saveSchedule(): void {
    if (this.savingSchedule()) return;
    this.savingSchedule.set(true);
    this.scheduleError.set('');
    const id = this.editingScheduleId();
    const obs = id
      ? this.scheduleService.update(id, this.scheduleForm)
      : this.scheduleService.create(this.scheduleForm);
    obs.subscribe({
      next: s => {
        if (id) {
          this.schedules.update(list => list.map(x => x.id === id ? s : x));
        } else {
          this.schedules.update(list => [...list, s]);
        }
        this.savingSchedule.set(false);
        this.editingSchedule.set(false);
      },
      error: () => { this.scheduleError.set('Failed to save schedule.'); this.savingSchedule.set(false); },
    });
  }

  runScheduleNow(s: ScheduledReport): void {
    this.scheduleService.runNow(s.id).subscribe({ error: () => {} });
  }

  deleteSchedule(s: ScheduledReport): void {
    this.scheduleService.delete(s.id).subscribe({
      next: () => this.schedules.update(list => list.filter(x => x.id !== s.id)),
      error: () => {},
    });
  }

  toggleAlertsPanel(): void {
    this.alertsPanelOpen = !this.alertsPanelOpen;
    if (this.alertsPanelOpen && this.alerts().length === 0 && !this.alertsLoading()) {
      this.loadAlerts();
    }
  }

  loadAlerts(): void {
    const tid = this.templateId();
    if (!tid) return;
    this.alertsLoading.set(true);
    this.alertService.list(tid).subscribe({
      next: a => { this.alerts.set(a); this.alertsLoading.set(false); },
      error: () => this.alertsLoading.set(false),
    });
  }

  openNewAlert(): void {
    this.alertForm = {
      report_template_id: this.templateId()!,
      name: '',
      condition_field: 'count',
      condition_operator: 'gt',
      threshold: 0,
      evaluation_cron: '0 * * * *',
      recipients: '',
      webhook_url: null,
      is_enabled: true,
    };
    this.editingAlertId.set(null);
    this.alertError.set('');
    this.editingAlert.set(true);
  }

  editAlert(a: ReportAlert): void {
    this.alertForm = {
      report_template_id: a.report_template_id,
      name: a.name,
      condition_field: a.condition_field,
      condition_operator: a.condition_operator,
      threshold: a.threshold,
      evaluation_cron: a.evaluation_cron,
      recipients: a.recipients ?? '',
      webhook_url: a.webhook_url ?? null,
      is_enabled: a.is_enabled,
    };
    this.editingAlertId.set(a.id);
    this.alertError.set('');
    this.editingAlert.set(true);
  }

  saveAlert(): void {
    if (this.savingAlert()) return;
    this.savingAlert.set(true);
    this.alertError.set('');
    const id = this.editingAlertId();
    const obs = id
      ? this.alertService.update(id, this.alertForm)
      : this.alertService.create(this.alertForm);
    obs.subscribe({
      next: a => {
        if (id) {
          this.alerts.update(list => list.map(x => x.id === id ? a : x));
        } else {
          this.alerts.update(list => [...list, a]);
        }
        this.savingAlert.set(false);
        this.editingAlert.set(false);
      },
      error: () => { this.alertError.set('Failed to save alert.'); this.savingAlert.set(false); },
    });
  }

  triggerAlertNow(a: ReportAlert): void {
    this.alertService.trigger(a.id).subscribe({ error: () => {} });
  }

  deleteAlert(a: ReportAlert): void {
    this.alertService.delete(a.id).subscribe({
      next: () => this.alerts.update(list => list.filter(x => x.id !== a.id)),
      error: () => {},
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/reports']);
  }
}
