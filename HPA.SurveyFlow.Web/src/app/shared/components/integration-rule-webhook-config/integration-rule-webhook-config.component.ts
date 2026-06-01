import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntegrationRuleWebhookConfig, WebhookHeader, PlaceholderDef } from '../../../core/models';
import { PlaceholderPickerComponent } from '../placeholder-picker/placeholder-picker.component';
import { buildPlaceholderCategories, PlaceholderFormField } from '../../../core/utils/placeholder-categories';
import { HelpTriggerComponent } from '../../help/help-trigger.component';

@Component({
  selector: 'app-integration-rule-webhook-config',
  standalone: true,
  imports: [CommonModule, FormsModule, PlaceholderPickerComponent, HelpTriggerComponent],
  template: `
    <div class="space-y-5">

      <!-- URL + Method -->
      <div class="flex gap-3">
        <div class="w-28 shrink-0">
          <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Method <app-help-trigger helpKey="admin.form.webhook-method" label="Help for webhook method" /></label>
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
          <div class="ta-input-group w-full">
            <input type="url" [ngModel]="config.url" (ngModelChange)="update({ url: $event })"
              placeholder="https://your-system.example.com/webhook"
              class="ta-input-group-field px-3 py-2" />
            <app-help-trigger helpKey="admin.form.webhook-url" label="Help for webhook URL" [inputGrouped]="true" />
          </div>
        </div>
      </div>

      <!-- Custom Headers -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="flex items-center gap-1 text-sm font-medium text-gray-700">Custom Headers <app-help-trigger helpKey="admin.form.webhook-headers" label="Help for webhook headers" /></label>
          <button type="button" (click)="addHeader()"
            class="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Add header</button>
        </div>

        @if (config.headers.length === 0) {
          <p class="text-sm text-gray-400 italic">No custom headers.</p>
        }

        <div class="space-y-2">
          @for (header of config.headers; track $index; let i = $index) {
            <div class="flex gap-2 items-start">
              <input type="text" [ngModel]="header.name" (ngModelChange)="updateHeader(i, 'name', $event)"
                placeholder="Header-Name"
                class="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500" />
              <div class="flex-1 flex flex-col gap-1">
                <div class="flex items-center gap-1">
                  <input type="text" [id]="'hdr-' + i"
                    [ngModel]="header.value" (ngModelChange)="updateHeader(i, 'value', $event)"
                    placeholder="value or {{'{{'}}placeholder{{'}}'}}"
                    class="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:ring-1 focus:ring-blue-500" />
                  <app-placeholder-picker
                    [categories]="categories()"
                    [alignRight]="true"
                    (placeholderSelected)="insertIntoHeader(i, $event)"
                  />
                </div>
              </div>
              <button type="button" (click)="removeHeader(i)"
                class="text-gray-400 hover:text-red-500 transition-colors p-1.5 shrink-0 mt-0.5">
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
        <div class="flex items-center justify-between mb-1">
          <label class="flex items-center gap-1 text-sm font-medium text-gray-700">
            Body Template <app-help-trigger helpKey="admin.form.webhook-body" label="Help for webhook body template" />
            <span class="text-gray-400 font-normal ml-1">(JSON — leave empty for no body)</span>
          </label>
          <app-placeholder-picker
            [categories]="categories()"
            [alignRight]="true"
            (placeholderSelected)="insertIntoBody($event)"
          />
        </div>
        <textarea id="webhook-body" [ngModel]="config.body_template" (ngModelChange)="update({ body_template: $event })"
          rows="7"
          placeholder='{&#10;  "submissionId": "{{"{{"}}submission_id{{"}}"}}",&#10;  "outcome": "{{"{{"}}outcome{{"}}"}}",&#10;  "user": "{{"{{"}}user_email{{"}}"}}"&#10;}'
          class="w-full text-sm font-mono border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 resize-y">
        </textarea>
      </div>

    </div>
  `
})
export class IntegrationRuleWebhookConfigComponent implements OnChanges {
  @Input() config: IntegrationRuleWebhookConfig = { url: '', method: 'POST', headers: [], body_template: '' };
  @Input() formFields: PlaceholderFormField[] = [];
  @Output() configChange = new EventEmitter<IntegrationRuleWebhookConfig>();

  categories = computed(() => buildPlaceholderCategories(this.formFields, false));

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] && this.config && !Array.isArray(this.config.headers)) {
      this.config = { ...this.config, headers: [] };
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

  insertIntoHeader(index: number, ph: PlaceholderDef) {
    const tag = `{{${ph.key}}}`;
    const el = document.getElementById(`hdr-${index}`) as HTMLInputElement | null;
    const current = this.config.headers[index]?.value ?? '';
    if (el) {
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? current.length;
      const updated = current.slice(0, start) + tag + current.slice(end);
      this.updateHeader(index, 'value', updated);
      setTimeout(() => { el.selectionStart = el.selectionEnd = start + tag.length; el.focus(); });
    } else {
      this.updateHeader(index, 'value', current + tag);
    }
  }

  insertIntoBody(ph: PlaceholderDef) {
    const tag = `{{${ph.key}}}`;
    const el = document.getElementById('webhook-body') as HTMLTextAreaElement | null;
    const current = this.config.body_template ?? '';
    if (el) {
      const start = el.selectionStart ?? current.length;
      const end = el.selectionEnd ?? current.length;
      const updated = current.slice(0, start) + tag + current.slice(end);
      this.update({ body_template: updated });
      setTimeout(() => { el.selectionStart = el.selectionEnd = start + tag.length; el.focus(); });
    } else {
      this.update({ body_template: current + tag });
    }
  }

  update(patch: Partial<IntegrationRuleWebhookConfig>) {
    this.config = { ...this.config, ...patch };
    this.configChange.emit(this.config);
  }
}
