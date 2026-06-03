import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationRuleSmsConfig, PlaceholderCategory } from '../../../../core/models';
import { HelpTriggerComponent } from '../../../../shared/help/help-trigger.component';

@Component({
  selector: 'app-notification-rule-sms-config',
  standalone: true,
  imports: [CommonModule, FormsModule, HelpTriggerComponent],
  template: `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          <span class="flex items-center gap-1">Recipients <app-help-trigger helpKey="admin.form.sms-recipients" label="Help for SMS recipients" /></span>
          <span class="text-gray-400 font-normal ml-1">(E.164 numbers, comma or newline separated)</span>
        </label>
        <textarea
          [ngModel]="recipientsText"
          (ngModelChange)="onRecipientsChange($event)"
          rows="2"
          placeholder="+61491570156, +61491570157"
          class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        ></textarea>
        @if (recipientCount > 0) {
          <p class="text-xs text-gray-500 mt-1">{{ recipientCount }} recipient{{ recipientCount > 1 ? 's' : '' }}</p>
        }
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          SMS message
          <span class="text-gray-400 font-normal ml-1">({{ (config.body || '').length }} chars)</span>
        </label>
        <textarea
          [ngModel]="config.body"
          (ngModelChange)="update({ body: $event })"
          rows="5"
          [placeholder]="'Fault reported for {{form_name}} submission #{{submission_id}}.'"
          class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        ></textarea>
      </div>

      <div class="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p class="text-xs font-medium text-gray-600 mb-2">Available placeholders</p>
        <div class="flex flex-wrap gap-1.5">
          @for (category of placeholderCategories; track category.label) {
            @for (placeholder of category.placeholders; track placeholder.key) {
              <button
                type="button"
                class="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:border-blue-300 hover:text-blue-700"
                (click)="appendPlaceholder(placeholder.key)"
              >{{ '{{' + placeholder.key + '}}' }}</button>
            }
          }
        </div>
      </div>
    </div>
  `
})
export class NotificationRuleSmsConfigComponent implements OnChanges {
  @Input() config: NotificationRuleSmsConfig = { to_numbers: [], body: '' };
  @Input() placeholderCategories: PlaceholderCategory[] = [];
  @Output() configChange = new EventEmitter<NotificationRuleSmsConfig>();

  recipientsText = '';
  recipientCount = 0;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] && this.config) {
      this.recipientsText = (this.config.to_numbers ?? []).join(', ');
      this.recipientCount = this.config.to_numbers?.length ?? 0;
    }
  }

  onRecipientsChange(raw: string) {
    const numbers = raw.split(/[,;\n\r]+/).map(s => s.trim()).filter(s => s.length > 0);
    this.recipientsText = raw;
    this.recipientCount = numbers.length;
    this.update({ to_numbers: numbers });
  }

  appendPlaceholder(key: string) {
    const suffix = `{{${key}}}`;
    const body = this.config.body ? `${this.config.body} ${suffix}` : suffix;
    this.update({ body });
  }

  update(patch: Partial<NotificationRuleSmsConfig>) {
    this.config = { ...this.config, ...patch };
    this.configChange.emit(this.config);
  }
}
