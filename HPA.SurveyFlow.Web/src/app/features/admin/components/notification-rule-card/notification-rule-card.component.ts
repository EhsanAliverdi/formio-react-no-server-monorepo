import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationRule, NotificationRuleEmailConfig, ConditionGroup, PlaceholderCategory } from '../../../../core/models';
import { FormField } from '../../../../shared/components/condition-group-editor/condition-group-editor.component';
import { ConditionGroupEditorComponent } from '../../../../shared/components/condition-group-editor/condition-group-editor.component';
import { RuleValidationBadgeComponent } from '../../../../shared/components/rule-validation-badge/rule-validation-badge.component';
import { NotificationRuleEmailConfigComponent } from '../notification-rule-email-config/notification-rule-email-config.component';

export type RuleCardMode = 'view' | 'edit';

@Component({
  selector: 'app-notification-rule-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConditionGroupEditorComponent,
    RuleValidationBadgeComponent,
    NotificationRuleEmailConfigComponent,
  ],
  template: `
    <div class="border rounded-xl overflow-hidden transition-shadow"
         [class.border-gray-200]="!expanded()"
         [class.border-blue-300]="expanded()"
         [class.shadow-sm]="!expanded()"
         [class.shadow-md]="expanded()">

      <!-- Card header -->
      <div class="flex items-center gap-3 px-4 py-3 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
           (click)="toggleExpand()">

        <!-- Drag handle (visual only) -->
        <svg class="w-4 h-4 text-gray-300 shrink-0 cursor-grab" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
        </svg>

        <!-- Enable toggle -->
        <label class="relative inline-flex items-center cursor-pointer" (click)="$event.stopPropagation()">
          <input type="checkbox" class="sr-only peer"
            [ngModel]="draft.enabled"
            (ngModelChange)="patchDraft({ enabled: $event })"/>
          <div class="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
        </label>

        <!-- Rule name -->
        @if (expanded()) {
          <input
            type="text"
            [ngModel]="draft.name"
            (ngModelChange)="patchDraft({ name: $event })"
            (click)="$event.stopPropagation()"
            placeholder="Rule name"
            class="flex-1 text-sm font-medium text-gray-900 border-0 border-b border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent py-0.5"
          />
        } @else {
          <span class="flex-1 text-sm font-medium text-gray-900 truncate">{{ draft.name || 'Unnamed rule' }}</span>
        }

        <!-- Channel badge -->
        <span class="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              [class.bg-blue-100]="draft.channel === 'email'"
              [class.text-blue-800]="draft.channel === 'email'">
          {{ draft.channel | titlecase }}
        </span>

        <!-- Validation badge -->
        <app-rule-validation-badge
          [conditionGroup]="draft.condition_group"
          [availableFieldKeys]="formFieldKeys"
          (click)="$event.stopPropagation()"
        />

        <!-- Expand chevron -->
        <svg class="w-4 h-4 text-gray-400 transition-transform shrink-0" [class.rotate-180]="expanded()"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>

        <!-- Delete -->
        <button type="button" (click)="$event.stopPropagation(); delete.emit()"
          class="shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors rounded" title="Delete rule">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>

      <!-- Expanded content -->
      @if (expanded()) {
        <div class="border-t border-gray-100 bg-white px-4 pb-4 pt-4 space-y-6">

          <!-- Conditions section -->
          <div>
            <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">1</span>
              Trigger Conditions
            </h4>
            <app-condition-group-editor
              [group]="draft.condition_group"
              [fields]="formFields"
              [depth]="0"
              (groupChange)="patchDraft({ condition_group: $event })"
            />
          </div>

          <!-- Channel config section -->
          <div class="border-t border-gray-100 pt-4">
            <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">2</span>
              Email Notification
            </h4>
            <app-notification-rule-email-config
              [config]="emailConfig"
              [placeholderCategories]="placeholderCategories"
              (configChange)="patchDraft({ email_config: $event })"
            />
          </div>

          <!-- Save / Cancel -->
          <div class="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" (click)="cancelEdit()"
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors">
              Cancel
            </button>
            <button type="button" (click)="save()"
              class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Save Rule
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class NotificationRuleCardComponent implements OnChanges {
  @Input() rule!: NotificationRule;
  @Input() formFields: FormField[] = [];
  @Input() placeholderCategories: PlaceholderCategory[] = [];
  @Output() ruleChange = new EventEmitter<NotificationRule>();
  @Output() delete = new EventEmitter<void>();

  expanded = signal(false);
  draft!: NotificationRule;
  private original!: NotificationRule;

  get formFieldKeys(): string[] { return this.formFields.map(f => f.key); }

  get emailConfig(): NotificationRuleEmailConfig {
    return this.draft.email_config ?? { to_addresses: [], subject: '', body_html: '', attach_pdf: false };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rule'] && this.rule) {
      this.draft = structuredClone(this.rule);
      this.original = structuredClone(this.rule);
    }
  }

  toggleExpand() { this.expanded.update(v => !v); }

  patchDraft(patch: Partial<NotificationRule>) {
    this.draft = { ...this.draft, ...patch };
  }

  save() {
    this.original = structuredClone(this.draft);
    this.ruleChange.emit(this.draft);
    this.expanded.set(false);
  }

  cancelEdit() {
    this.draft = structuredClone(this.original);
    this.expanded.set(false);
  }
}
