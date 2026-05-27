import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegrationRuleMexConfig, MexFieldMapping, MexFieldMappingSource, MEX_FIELDS } from '../../../core/models';
import { FormField } from '../condition-group-editor/condition-group-editor.component';

@Component({
  selector: 'app-integration-rule-mex-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-5">

      <!-- Action -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Action</label>
        <select [ngModel]="config.action" (ngModelChange)="update({ action: $event })"
          class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <option value="create_request">Create Request</option>
        </select>
      </div>

      <!-- Optional field overrides -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Contact ID field
            <span class="text-gray-400 font-normal ml-1">(optional — default: 1)</span>
          </label>
          <select [ngModel]="config.contact_id_field ?? ''"
            (ngModelChange)="update({ contact_id_field: $event || undefined })"
            class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
            <option value="">— use default (1) —</option>
            @for (f of formFields; track f.key) {
              <option [value]="f.key">{{ f.label }} ({{ f.key }})</option>
            }
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            Job Type field
            <span class="text-gray-400 font-normal ml-1">(optional — fetch first active)</span>
          </label>
          <select [ngModel]="config.job_type_field ?? ''"
            (ngModelChange)="update({ job_type_field: $event || undefined })"
            class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
            <option value="">— fetch first active from MEX —</option>
            @for (f of formFields; track f.key) {
              <option [value]="f.key">{{ f.label }} ({{ f.key }})</option>
            }
          </select>
        </div>
      </div>

      <!-- Field Mappings -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700">Field Mappings</label>
          <button type="button" (click)="addMapping()"
            class="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add mapping</button>
        </div>

        @if (mappingRows.length === 0) {
          <p class="text-sm text-gray-400 italic">No field mappings — default values will be used.</p>
        }

        <div class="space-y-2">
          @for (row of mappingRows; track row.mexField; let i = $index) {
            <div class="grid grid-cols-12 gap-2 items-start bg-gray-50 rounded-lg p-3">

              <!-- MEX field -->
              <div class="col-span-3">
                <label class="block text-xs text-gray-500 mb-1">MEX Field</label>
                <select [ngModel]="row.mexField" (ngModelChange)="updateMexField(i, $event)"
                  class="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500">
                  <option value="">— select —</option>
                  @for (f of mexFields; track f.key) {
                    <option [value]="f.key">{{ f.label }}</option>
                  }
                </select>
              </div>

              <!-- Source -->
              <div class="col-span-2">
                <label class="block text-xs text-gray-500 mb-1">Source</label>
                <select [ngModel]="row.mapping.source" (ngModelChange)="updateMappingSource(i, $event)"
                  class="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500">
                  <option value="field">Form field</option>
                  <option value="static">Static value</option>
                  <option value="template">Template</option>
                  <option value="abnormal_answers">Abnormal answers</option>
                </select>
              </div>

              <!-- Value (conditional on source) -->
              <div class="col-span-6">
                <label class="block text-xs text-gray-500 mb-1">
                  {{ row.mapping.source === 'field' ? 'Form Field' :
                     row.mapping.source === 'static' ? 'Value' :
                     row.mapping.source === 'template' ? 'Template (use {{field:key}}, {{submission_id}}, …)' :
                     'Auto-generated' }}
                </label>

                @if (row.mapping.source === 'field') {
                  <select [ngModel]="row.mapping.fieldKey ?? ''" (ngModelChange)="updateMappingValue(i, 'fieldKey', $event)"
                    class="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500">
                    <option value="">— select field —</option>
                    @for (f of formFields; track f.key) {
                      <option [value]="f.key">{{ f.label }} ({{ f.key }})</option>
                    }
                  </select>
                } @else if (row.mapping.source === 'static') {
                  <input type="text" [ngModel]="row.mapping.value ?? ''" (ngModelChange)="updateMappingValue(i, 'value', $event)"
                    placeholder="Static value"
                    class="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500" />
                } @else if (row.mapping.source === 'template') {
                  <input type="text" [ngModel]="row.mapping.template ?? ''" (ngModelChange)="updateMappingValue(i, 'template', $event)"
                    placeholder="e.g. Form: {{ '{{form_name}}' }}, Submitted: {{ '{{submission_id}}' }}"
                    class="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500" />
                } @else {
                  <span class="text-xs text-gray-400 italic block py-1.5">All abnormal answers will be included automatically.</span>
                }
              </div>

              <!-- Remove -->
              <div class="col-span-1 flex items-end pb-0.5">
                <button type="button" (click)="removeMapping(i)"
                  class="text-gray-400 hover:text-red-500 transition-colors p-1">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          }
        </div>
      </div>

    </div>
  `
})
export class IntegrationRuleMexConfigComponent implements OnChanges {
  @Input() config: IntegrationRuleMexConfig = { action: 'create_request', field_mappings: {} };
  @Input() formFields: FormField[] = [];
  @Output() configChange = new EventEmitter<IntegrationRuleMexConfig>();

  readonly mexFields = MEX_FIELDS;
  mappingRows: { mexField: string; mapping: MexFieldMapping }[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] && this.config) {
      this.mappingRows = Object.entries(this.config.field_mappings ?? {}).map(([mexField, mapping]) => ({
        mexField,
        mapping: { ...mapping }
      }));
    }
  }

  addMapping() {
    this.mappingRows = [...this.mappingRows, { mexField: '', mapping: { source: 'field' } }];
    this.emit();
  }

  removeMapping(index: number) {
    this.mappingRows = this.mappingRows.filter((_, i) => i !== index);
    this.emit();
  }

  updateMexField(index: number, mexField: string) {
    this.mappingRows = this.mappingRows.map((r, i) => i === index ? { ...r, mexField } : r);
    this.emit();
  }

  updateMappingSource(index: number, source: MexFieldMappingSource) {
    this.mappingRows = this.mappingRows.map((r, i) =>
      i === index ? { ...r, mapping: { source } } : r
    );
    this.emit();
  }

  updateMappingValue(index: number, key: 'fieldKey' | 'value' | 'template', val: string) {
    this.mappingRows = this.mappingRows.map((r, i) =>
      i === index ? { ...r, mapping: { ...r.mapping, [key]: val } } : r
    );
    this.emit();
  }

  update(patch: Partial<IntegrationRuleMexConfig>) {
    this.config = { ...this.config, ...patch };
    this.configChange.emit(this.config);
  }

  private emit() {
    const field_mappings: Record<string, MexFieldMapping> = {};
    for (const row of this.mappingRows) {
      if (row.mexField) field_mappings[row.mexField] = row.mapping;
    }
    this.config = { ...this.config, field_mappings };
    this.configChange.emit(this.config);
  }
}
