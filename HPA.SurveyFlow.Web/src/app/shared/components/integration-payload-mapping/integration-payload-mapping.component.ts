import { Component, Input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type MappingSource = 'default' | 'field' | 'static' | 'template' | 'abnormal_answers';
type ActionField = {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'datetime';
  maxLength?: number;
  required?: boolean;
  recommended?: boolean;
  help: string;
};
type MappableFormField = { key: string; label: string; type: string };

const TEMPLATE_HELP = 'Templates can combine typed text with tokens such as {{field:fieldKey}}, {{warning_answers}}, {{error_answers}}, {{abnormal_answers}}, {{submission_id}}, {{form_name}}, and {{user_email}}.';

const ACTION_SCHEMAS: Record<string, { label: string; help: string; fields: ActionField[] }> = {
  'mex:create_request': {
    label: 'MEX Create Request',
    help: 'Configure only the RequestDTO fields this form should override. Fields left as Default use the MEX create request defaults. SurveyFlow trims known length-limited strings and converts values to the expected MEX type before sending.',
    fields: [
      { key: 'requestNumber', label: 'Request number', type: 'number', required: true, help: 'Required MEX request number. Leave as Default unless this form provides a controlled number.' },
      { key: 'estimatedCost', label: 'Estimated cost', type: 'number', required: true, help: 'Required estimated cost. Default is 0.' },
      { key: 'requesterDetails', label: 'Requester details', type: 'string', maxLength: 4000, recommended: true, help: 'Short details about the requester or request context sent to MEX. Maximum 4000 characters.' },
      { key: 'jobDescription', label: 'Job description', type: 'string', recommended: true, help: 'Main request description. This is usually where warning and error answers are included.' },
      { key: 'asset', label: 'Asset', type: 'string', recommended: true, help: 'MEX validates this as a real AssetNumber. Map this only when the form value exactly matches an existing MEX asset; otherwise use Asset description or Job description.' },
      { key: 'jobTypeName', label: 'Job type name', type: 'string', maxLength: 10, recommended: true, help: 'MEX validates this as an existing job type name. Maximum 10 characters. Leave as Default to let SurveyFlow choose the first active MEX job type.' },
      { key: 'priorityNumber', label: 'Priority number', type: 'number', help: 'Numeric MEX priority value. Use a static number or map a numeric form field.' },
      { key: 'priorityDescription', label: 'Priority description', type: 'string', maxLength: 25, help: 'MEX validates this against the priority number. Only send it when it exactly matches the MEX description for the selected priority. Maximum 25 characters.' },
      { key: 'requestedDateTime', label: 'Requested date/time', type: 'datetime', help: 'Requested timestamp. Leave as Default to use submission time.' },
      { key: 'requestedBy', label: 'Requested by', type: 'string', help: 'MEX validates this as an existing requester/contact. For anonymous/public forms, usually leave this as Default and put the typed operator name in Requester details.' },
      { key: 'workPhoneNo', label: 'Work phone number', type: 'string', help: 'Requester work phone number.' },
      { key: 'mobile', label: 'Mobile', type: 'string', help: 'Requester mobile number.' },
      { key: 'email', label: 'Email', type: 'string', help: 'Requester email address.' },
      { key: 'emailListToNotify', label: 'Email list to notify', type: 'string', help: 'Comma-separated email addresses that MEX should notify if supported by the target endpoint.' },
      { key: 'assetDescription', label: 'Asset description', type: 'string', help: 'Optional asset description.' },
      { key: 'jobType', label: 'Job type', type: 'number', help: 'Optional numeric MEX job type identifier.' },
      { key: 'department', label: 'Department', type: 'string', help: 'Department text to send with this request.' },
      { key: 'priority', label: 'Priority', type: 'number', help: 'Optional numeric MEX priority identifier.' },
      { key: 'status', label: 'Status', type: 'number', help: 'Optional numeric MEX status identifier. Usually left as Default for create request.' },
      { key: 'statusAsOf', label: 'Status as of', type: 'datetime', help: 'Optional status timestamp. Usually left as Default for create request.' },
      { key: 'statusUpdatedBy', label: 'Status updated by', type: 'string', help: 'Optional status updater. Usually left as Default for create request.' },
      { key: 'approvalPath', label: 'Approval path', type: 'string', help: 'Approval path text if your MEX request process expects one.' },
      { key: 'jobTypeDescription', label: 'Job type description', type: 'string', maxLength: 50, help: 'Optional job type description. Maximum 50 characters.' },
      { key: 'response', label: 'Response', type: 'string', help: 'Optional response text.' },
      { key: 'reasonCancelled', label: 'Reason cancelled', type: 'string', help: 'Optional cancellation reason. Usually left as Default for create request.' },
      { key: 'workOrderNumber', label: 'Work order number', type: 'number', help: 'Optional work order number. Usually left as Default for create request.' },
      { key: 'workOrderCreatedDate', label: 'Work order created date', type: 'datetime', help: 'Optional work order creation date. Usually left as Default for create request.' },
      { key: 'workOrderCreatedBy', label: 'Work order created by', type: 'string', help: 'Optional work order creator. Usually left as Default for create request.' },
      { key: 'workOrderFinishDate', label: 'Work order finish date', type: 'datetime', help: 'Optional work order finish date. Usually left as Default for create request.' },
      { key: 'workOrderAccountCode', label: 'Work order account code', type: 'string', help: 'Optional work order account code. Usually left as Default for create request.' },
      { key: 'workOrderStatus', label: 'Work order status', type: 'string', help: 'Optional work order status. Usually left as Default for create request.' },
      { key: 'isCancelled', label: 'Is cancelled', type: 'boolean', help: 'Optional cancellation flag. Usually left as Default for create request.' },
      { key: 'cancelledOn', label: 'Cancelled on', type: 'datetime', help: 'Optional cancellation timestamp.' },
      { key: 'cancelledBy', label: 'Cancelled by', type: 'string', help: 'Optional cancellation user.' },
      { key: 'isCompleted', label: 'Is completed', type: 'boolean', help: 'Optional completion flag. Usually left as Default for create request.' },
      { key: 'completedOn', label: 'Completed on', type: 'datetime', help: 'Optional completion timestamp.' },
      { key: 'completedBy', label: 'Completed by', type: 'string', help: 'Optional completion user.' },
      { key: 'isAccepted', label: 'Is accepted', type: 'boolean', help: 'Optional acceptance flag. Usually left as Default for create request.' },
      { key: 'acceptedOn', label: 'Accepted on', type: 'datetime', help: 'Optional accepted timestamp.' },
      { key: 'acceptedBy', label: 'Accepted by', type: 'string', help: 'Optional accepted user.' },
      { key: 'respondedDateTime', label: 'Responded date/time', type: 'datetime', help: 'Optional response timestamp.' },
      { key: 'requestId', label: 'Request ID', type: 'number', help: 'Optional MEX request identifier. Usually left as Default when creating a request.' },
    ],
  },
};

@Component({
  selector: 'app-integration-payload-mapping',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-gray-700">
            Payload mapping
            <span class="cursor-help rounded-full border border-gray-300 px-1.5 text-[10px] text-gray-500"
              [attr.title]="schema().help">?</span>
          </div>
          <p class="mt-1 text-xs text-gray-500">{{ configuredCount() }} custom field override{{ configuredCount() === 1 ? '' : 's' }}.</p>
        </div>
        <button type="button" (click)="open.set(true)"
          class="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
          Configure payload
        </button>
      </div>
    </div>

    @if (open()) {
      <div class="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
        <div class="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
          <div class="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
            <div>
              <h3 class="text-base font-semibold text-gray-900">{{ schema().label }} payload</h3>
              <p class="mt-1 text-sm text-gray-500">{{ schema().help }}</p>
            </div>
            <button type="button" (click)="open.set(false)"
              class="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100">Close</button>
          </div>

          <div class="overflow-y-auto px-5 py-4">
            <div class="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Only configured rows override the default integration payload. Use templates when one integration field needs several form answers or warning/error details.
            </div>

            <div class="mb-4 flex flex-wrap gap-2">
              @for (token of templateTokens; track token.value) {
                <button type="button" class="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                  [attr.title]="token.help">
                  {{ token.value }}
                </button>
              }
            </div>

            <h4 class="mb-2 text-sm font-semibold text-gray-800">Recommended fields</h4>
            <div class="overflow-hidden rounded-lg border border-gray-200">
              @for (field of recommendedFields(); track field.key) {
                <ng-container *ngTemplateOutlet="fieldRow; context: { field: field }"></ng-container>
              }
            </div>

            <details class="mt-5">
              <summary class="cursor-pointer text-sm font-semibold text-gray-800">Advanced fields</summary>
              <div class="mt-3 overflow-hidden rounded-lg border border-gray-200">
                @for (field of advancedFields(); track field.key) {
                  <ng-container *ngTemplateOutlet="fieldRow; context: { field: field }"></ng-container>
                }
              </div>
            </details>
          </div>

          <div class="flex justify-end border-t border-gray-200 px-5 py-4">
            <button type="button" (click)="open.set(false)"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Done</button>
          </div>
        </div>
      </div>
    }

    <ng-template #fieldRow let-field="field">
      <div class="grid grid-cols-1 gap-3 border-b border-gray-200 bg-white p-4 last:border-b-0 lg:grid-cols-[220px_180px_1fr_100px]">
        <div>
          <div class="flex items-center gap-2 text-sm font-medium text-gray-900">
            {{ field.label }}
            @if (field.required) { <span class="text-red-500">*</span> }
            <span class="cursor-help rounded-full border border-gray-300 px-1.5 text-[10px] text-gray-500"
              [attr.title]="field.help">?</span>
          </div>
          <div class="mt-1 font-mono text-xs text-gray-500">{{ field.key }}</div>
          <div class="mt-1 text-xs text-gray-400">
            {{ field.type }}@if (field.maxLength) { <span> · max {{ field.maxLength }}</span> }
          </div>
        </div>

        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">Source</label>
          <select class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            [ngModel]="mapping(field.key).source"
            (ngModelChange)="setSource(field.key, $event)">
            <option value="default">Default</option>
            <option value="field">Form field</option>
            <option value="static">Static value</option>
            <option value="template">Template</option>
            <option value="abnormal_answers">Warning/error answers</option>
          </select>
        </div>

        <div>
          @if (mapping(field.key).source === 'field') {
            <label class="mb-1 block text-xs font-medium text-gray-600">Form field</label>
            <select class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              [(ngModel)]="mapping(field.key).fieldKey">
              <option value="">Select a form field</option>
              @for (formField of formFields(); track formField.key) {
                <option [value]="formField.key">{{ formField.label }} ({{ formField.key }})</option>
              }
            </select>
          } @else if (mapping(field.key).source === 'static') {
            <label class="mb-1 block text-xs font-medium text-gray-600">Static value</label>
            <input class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              [(ngModel)]="mapping(field.key).value"
              [attr.maxlength]="field.maxLength || null"
              [type]="field.type === 'number' ? 'number' : field.type === 'boolean' ? 'text' : 'text'"
              placeholder="Value to send" />
          } @else if (mapping(field.key).source === 'template') {
            <label class="mb-1 flex items-center gap-2 text-xs font-medium text-gray-600">
              Template
              <span class="cursor-help rounded-full border border-gray-300 px-1.5 text-[10px] text-gray-500"
                [attr.title]="templateHelp">?</span>
            </label>
            <textarea rows="4" class="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
              [(ngModel)]="mapping(field.key).template"
              [attr.maxlength]="field.maxLength || null"
              [placeholder]="templatePlaceholder"></textarea>
          } @else if (mapping(field.key).source === 'abnormal_answers') {
            <label class="mb-1 block text-xs font-medium text-gray-600">Include</label>
            <select class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              [(ngModel)]="mapping(field.key).level">
              <option value="all">Warnings and errors</option>
              <option value="warning">Warnings only</option>
              <option value="error">Errors only</option>
            </select>
          } @else {
            <div class="rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500">
              Uses the default {{ schema().label }} value.
            </div>
          }
        </div>

        <div class="flex items-end">
          <button type="button" (click)="reset(field.key)"
            class="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50">
            Reset
          </button>
        </div>
      </div>
    </ng-template>
  `,
})
export class IntegrationPayloadMappingComponent {
  @Input({ required: true }) config!: any;
  private formSchemaSignal = signal<any>(null);
  @Input() set formSchema(value: any) {
    this.formSchemaSignal.set(value);
  }

  open = signal(false);
  templateHelp = TEMPLATE_HELP;
  templatePlaceholder = 'Submitted via SurveyFlow\n{{warning_answers}}\n{{error_answers}}';
  templateTokens = [
    { value: '{{field:fieldKey}}', help: 'Insert the submitted value for a specific form field key.' },
    { value: '{{warning_answers}}', help: 'Insert warning question labels and submitted answers.' },
    { value: '{{error_answers}}', help: 'Insert error question labels and submitted answers.' },
    { value: '{{abnormal_answers}}', help: 'Insert all warning and error answers.' },
    { value: '{{submission_id}}', help: 'Submission identifier assigned after submit.' },
    { value: '{{form_name}}', help: 'Name of the form that produced this submission.' },
    { value: '{{user_email}}', help: 'Email of the signed-in submitter when available.' },
  ];

  schema = computed(() =>
    ACTION_SCHEMAS[`${this.config?.integration || 'mex'}:${this.config?.action || 'create_request'}`]
      ?? { label: 'Integration action', help: 'Configure integration payload overrides.', fields: [] }
  );
  recommendedFields = computed(() => this.schema().fields.filter(f => f.recommended));
  advancedFields = computed(() => this.schema().fields.filter(f => !f.recommended));
  configuredCount = computed(() => Object.values(this.config?.fieldMappings ?? {}).filter((m: any) => m?.source && m.source !== 'default').length);
  formFields = computed(() => collectFormFields(this.formSchemaSignal()));

  mapping(key: string): any {
    this.config.fieldMappings ??= {};
    this.config.fieldMappings[key] ??= { source: 'default' };
    return this.config.fieldMappings[key];
  }

  setSource(key: string, source: MappingSource): void {
    const current = this.mapping(key);
    this.config.fieldMappings[key] = { source };
    if (source === 'field') this.config.fieldMappings[key].fieldKey = current.fieldKey || '';
    if (source === 'static') this.config.fieldMappings[key].value = current.value ?? '';
    if (source === 'template') this.config.fieldMappings[key].template = current.template || '';
    if (source === 'abnormal_answers') this.config.fieldMappings[key].level = current.level || 'all';
    if (source === 'default') this.reset(key);
  }

  reset(key: string): void {
    if (!this.config?.fieldMappings) return;
    delete this.config.fieldMappings[key];
  }
}

function collectFormFields(schema: any): MappableFormField[] {
  const fields: MappableFormField[] = [];
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.key && node.type && node.type !== 'button' && node.input !== false) {
      fields.push({
        key: node.key,
        label: node.label || node.title || node.key,
        type: node.type,
      });
    }
    for (const child of node.components ?? []) visit(child);
    for (const column of node.columns ?? []) for (const child of column.components ?? []) visit(child);
    for (const row of node.rows ?? []) for (const column of row ?? []) for (const child of column.components ?? []) visit(child);
  };
  visit(schema);
  return fields;
}
