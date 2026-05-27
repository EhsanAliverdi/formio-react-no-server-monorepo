import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegrationRuleWebhookConfig, WebhookHeader } from '../../../core/models';

@Component({
  selector: 'app-integration-rule-webhook-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-4">

      <!-- URL + Method -->
      <div class="flex gap-3">
        <div class="w-28 shrink-0">
          <label class="block text-sm font-medium text-gray-700 mb-1">Method</label>
          <select [ngModel]="config.method" (ngModelChange)="update({ method: $event })"
            class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
            <option value="GET">GET</option>
          </select>
        </div>
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <input type="url" [ngModel]="config.url" (ngModelChange)="update({ url: $event })"
            placeholder="https://your-system.example.com/webhook"
            class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>

      <!-- Custom Headers -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-gray-700">Custom Headers</label>
          <button type="button" (click)="addHeader()"
            class="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add header</button>
        </div>

        @if (config.headers.length === 0) {
          <p class="text-sm text-gray-400 italic">No custom headers.</p>
        }

        <div class="space-y-2">
          @for (header of config.headers; track $index; let i = $index) {
            <div class="flex gap-2 items-center">
              <input type="text" [ngModel]="header.name" (ngModelChange)="updateHeader(i, 'name', $event)"
                placeholder="Header-Name"
                class="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500" />
              <input type="text" [ngModel]="header.value" (ngModelChange)="updateHeader(i, 'value', $event)"
                [placeholder]="headerValuePlaceholder"
                class="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500" />
              <button type="button" (click)="removeHeader(i)"
                class="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Body Template -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          Body Template
          <span class="text-gray-400 font-normal ml-1">(JSON — leave empty for no body)</span>
        </label>
        <textarea [ngModel]="config.body_template" (ngModelChange)="update({ body_template: $event })"
          rows="6"
          [placeholder]="bodyPlaceholder"
          class="w-full text-sm font-mono border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 resize-y">
        </textarea>
        <p class="text-xs text-gray-500 mt-1">
          Available placeholders: <code>{{ '{{submission_id}}' }}</code>, <code>{{ '{{form_name}}' }}</code>,
          <code>{{ '{{user_email}}' }}</code>, <code>{{ '{{outcome}}' }}</code>,
          <code>{{ '{{field:fieldKey}}' }}</code>
        </p>
      </div>

    </div>
  `
})
export class IntegrationRuleWebhookConfigComponent implements OnChanges {
  @Input() config: IntegrationRuleWebhookConfig = { url: '', method: 'POST', headers: [], body_template: '' };
  @Output() configChange = new EventEmitter<IntegrationRuleWebhookConfig>();

  readonly bodyPlaceholder = '{ "submissionId": "{{submission_id}}", "form": "{{form_name}}", "user": "{{user_email}}", "outcome": "{{outcome}}" }';
  readonly headerValuePlaceholder = 'value or {{placeholder}}';

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] && this.config) {
      // Ensure headers is always an array
      if (!Array.isArray(this.config.headers)) {
        this.config = { ...this.config, headers: [] };
      }
    }
  }

  addHeader() {
    this.config = { ...this.config, headers: [...this.config.headers, { name: '', value: '' }] };
    this.configChange.emit(this.config);
  }

  removeHeader(index: number) {
    this.config = { ...this.config, headers: this.config.headers.filter((_, i) => i !== index) };
    this.configChange.emit(this.config);
  }

  updateHeader(index: number, key: keyof WebhookHeader, value: string) {
    const headers = this.config.headers.map((h, i) => i === index ? { ...h, [key]: value } : h);
    this.config = { ...this.config, headers };
    this.configChange.emit(this.config);
  }

  update(patch: Partial<IntegrationRuleWebhookConfig>) {
    this.config = { ...this.config, ...patch };
    this.configChange.emit(this.config);
  }
}
