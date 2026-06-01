import { Component, Input, Output, EventEmitter, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlaceholderCategory, PlaceholderDef } from '../../../core/models';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { PlaceholderPickerComponent } from '../placeholder-picker/placeholder-picker.component';
import { HelpTriggerComponent } from '../../help/help-trigger.component';

export interface EmailBodyBuilderValue {
  subject: string;
  bodyHtml: string;
}

@Component({
  selector: 'app-email-body-builder',
  standalone: true,
  imports: [CommonModule, FormsModule, RichTextEditorComponent, PlaceholderPickerComponent, HelpTriggerComponent],
  template: `
    <div class="space-y-4">

      <!-- Subject line -->
      <div>
        <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Subject <app-help-trigger helpKey="admin.form.email-subject" label="Help for email subject" /></label>
        <div class="flex items-center gap-2">
          <input
            type="text"
            [ngModel]="value.subject"
            (ngModelChange)="update('subject', $event)"
            placeholder="e.g. Alert: {{'{{'}}form_name{{'}}'}} requires attention"
            class="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <app-placeholder-picker
            [categories]="placeholderCategories"
            [alignRight]="true"
            (placeholderSelected)="insertIntoSubject($event)"
          />
        </div>
      </div>

      <!-- Body -->
      <div>
        <label class="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">Body <app-help-trigger helpKey="admin.form.email-body" label="Help for email body" /></label>
        <app-rich-text-editor
          #bodyEditor
          [value]="value.bodyHtml"
          (valueChange)="update('bodyHtml', $event)"
          placeholder="Write the email body here..."
        >
          <!-- Extra toolbar slot: placeholder picker -->
          <div slot="toolbar-extra">
            <app-placeholder-picker
              [categories]="placeholderCategories"
              (placeholderSelected)="insertIntoBody($event)"
            />
          </div>
        </app-rich-text-editor>
      </div>

      <!-- Placeholder reference table (collapsible) -->
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        <button
          type="button"
          (click)="toggleRef()"
          class="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 transition-colors"
        >
          <span class="flex items-center gap-2">
            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            Available Placeholders
          </span>
          <svg class="w-4 h-4 text-gray-400 transition-transform" [class.rotate-180]="showRef()" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>

        @if (showRef()) {
          <div class="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white">
            @for (cat of placeholderCategories; track cat.label) {
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{{ cat.label }}</p>
                <div class="space-y-1">
                  @for (ph of cat.placeholders; track ph.key) {
                    <div class="flex items-start gap-2 group cursor-pointer" (click)="insertIntoBody(ph)" title="Click to insert">
                      <code class="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono group-hover:bg-blue-100 transition-colors shrink-0">{{'{{'}}{{ph.key}}{{'}}'}}</code>
                      <span class="text-xs text-gray-500 leading-tight">{{ ph.label }}</span>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `
})
export class EmailBodyBuilderComponent {
  @Input() value: EmailBodyBuilderValue = { subject: '', bodyHtml: '' };
  @Input() placeholderCategories: PlaceholderCategory[] = [];
  @Output() valueChange = new EventEmitter<EmailBodyBuilderValue>();

  @ViewChild('bodyEditor') bodyEditor?: RichTextEditorComponent;

  showRef = signal(false);
  toggleRef() { this.showRef.update(v => !v); }

  // Subject field — simple string insertion at cursor not possible in plain input without refs,
  // so we append to the subject string for simplicity.
  private subjectInput?: HTMLInputElement;

  update(field: 'subject' | 'bodyHtml', val: string) {
    this.value = { ...this.value, [field]: val };
    this.valueChange.emit(this.value);
  }

  insertIntoSubject(ph: PlaceholderDef) {
    const tag = `{{${ph.key}}}`;
    this.update('subject', (this.value.subject ?? '') + tag);
  }

  insertIntoBody(ph: PlaceholderDef) {
    const tag = `<span class="placeholder-tag">{{${ph.key}}}</span>`;
    if (this.bodyEditor) {
      this.bodyEditor.insertHtml(tag + '&nbsp;');
    }
  }
}
