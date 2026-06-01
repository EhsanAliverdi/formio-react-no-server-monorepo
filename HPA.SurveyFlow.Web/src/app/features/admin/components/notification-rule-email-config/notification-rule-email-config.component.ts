import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationRuleEmailConfig, PlaceholderCategory, PlaceholderDef } from '../../../../core/models';
import { EmailBodyBuilderComponent, EmailBodyBuilderValue } from '../../../../shared/components/email-body-builder/email-body-builder.component';
import { HelpTriggerComponent } from '../../../../shared/help/help-trigger.component';

@Component({
  selector: 'app-notification-rule-email-config',
  standalone: true,
  imports: [CommonModule, FormsModule, EmailBodyBuilderComponent, HelpTriggerComponent],
  template: `
    <div class="space-y-4">

      <!-- Recipients -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">
          <span class="flex items-center gap-1">Recipients <app-help-trigger helpKey="admin.form.email-recipients" label="Help for email recipients" /></span>
          <span class="text-gray-400 font-normal ml-1">(comma or newline separated)</span>
        </label>
        <textarea
          [ngModel]="recipientsText"
          (ngModelChange)="onRecipientsChange($event)"
          rows="2"
          placeholder="safety@example.com, manager@example.com"
          class="w-full text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        ></textarea>
        @if (recipientCount > 0) {
          <p class="text-xs text-gray-500 mt-1">{{ recipientCount }} recipient{{ recipientCount > 1 ? 's' : '' }}</p>
        }
      </div>

      <!-- Subject + Body -->
      <app-email-body-builder
        [value]="bodyBuilderValue"
        [placeholderCategories]="placeholderCategories"
        (valueChange)="onBodyChange($event)"
      />

      <!-- Attach PDF -->
      <label class="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          [ngModel]="config.attach_pdf"
          (ngModelChange)="update({ attach_pdf: $event })"
          class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <span class="flex items-center gap-1 text-sm text-gray-700">Attach submission PDF <app-help-trigger helpKey="admin.form.email-pdf" label="Help for email PDF attachment" /></span>
      </label>

    </div>
  `
})
export class NotificationRuleEmailConfigComponent implements OnChanges {
  @Input() config: NotificationRuleEmailConfig = { to_addresses: [], subject: '', body_html: '', attach_pdf: false };
  @Input() placeholderCategories: PlaceholderCategory[] = [];
  @Output() configChange = new EventEmitter<NotificationRuleEmailConfig>();

  recipientsText = '';
  recipientCount = 0;
  bodyBuilderValue: EmailBodyBuilderValue = { subject: '', bodyHtml: '' };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['config'] && this.config) {
      this.recipientsText = (this.config.to_addresses ?? []).join(', ');
      this.recipientCount = this.config.to_addresses?.length ?? 0;
      this.bodyBuilderValue = { subject: this.config.subject ?? '', bodyHtml: this.config.body_html ?? '' };
    }
  }

  onRecipientsChange(raw: string) {
    const addresses = raw.split(/[,;\n\r]+/).map(s => s.trim()).filter(s => s.length > 0);
    this.recipientsText = raw;
    this.recipientCount = addresses.length;
    this.update({ to_addresses: addresses });
  }

  onBodyChange(val: EmailBodyBuilderValue) {
    this.bodyBuilderValue = val;
    this.update({ subject: val.subject, body_html: val.bodyHtml });
  }

  update(patch: Partial<NotificationRuleEmailConfig>) {
    this.config = { ...this.config, ...patch };
    this.configChange.emit(this.config);
  }
}
