import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegrationRuleMexConfig } from '../../../core/models';
import { FormField } from '../condition-group-editor/condition-group-editor.component';
import { IntegrationPayloadMappingComponent, MappableFormField } from '../integration-payload-mapping/integration-payload-mapping.component';
import { HelpTriggerComponent } from '../../help/help-trigger.component';

@Component({
  selector: 'app-integration-rule-mex-config',
  standalone: true,
  imports: [CommonModule, FormsModule, IntegrationPayloadMappingComponent, HelpTriggerComponent],
  template: `
    <div class="space-y-4">

      <!-- Action -->
      <div>
        <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Action <app-help-trigger helpKey="admin.form.mex-action" label="Help for MEX action" /></label>
        <select [ngModel]="config.action" (ngModelChange)="update({ action: $event })"
          class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
          <option value="create_request">Create Request</option>
        </select>
      </div>

      <!-- Payload Mappings -->
      <app-integration-payload-mapping
        [actionKey]="'mex:' + config.action"
        [fieldMappings]="config.field_mappings"
        [formFields]="formFields"
        (fieldMappingsChange)="update({ field_mappings: $event })" />

    </div>
  `
})
export class IntegrationRuleMexConfigComponent {
  @Input() config: IntegrationRuleMexConfig = { action: 'create_request', field_mappings: {} };
  @Input() formFields: FormField[] = [];
  @Output() configChange = new EventEmitter<IntegrationRuleMexConfig>();

  update(patch: Partial<IntegrationRuleMexConfig>) {
    this.config = { ...this.config, ...patch };
    this.configChange.emit(this.config);
  }
}
