import { Component, Input, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NotificationRule, SaveNotificationRuleRequest,
  ConditionGroup, PlaceholderCategory
} from '../../../../core/models';
import { NotificationRulesService } from '../../../../core/services/notification-rules.service';
import { FormField } from '../../../../shared/components/condition-group-editor/condition-group-editor.component';
import { NotificationRuleCardComponent } from '../notification-rule-card/notification-rule-card.component';
import { OverlapWarningPanelComponent } from '../overlap-warning-panel/overlap-warning-panel.component';
import { buildPlaceholderCategories } from '../../../../core/utils/placeholder-categories';
import { extractFormioFields } from '../../../../core/utils/formio-fields';
import { HelpTriggerComponent } from '../../../../shared/help/help-trigger.component';

@Component({
  selector: 'app-notification-rules-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, NotificationRuleCardComponent, OverlapWarningPanelComponent, HelpTriggerComponent],
  template: `
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-gray-900">Notification Rules</h3>
          <p class="text-sm text-gray-500 mt-0.5">Define conditions that trigger email notifications when a form is submitted.</p>
        </div>
        <div class="ta-btn-group">
          <button type="button" (click)="addRule()" class="ta-btn-group-action">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            Add Rule
          </button>
          <app-help-trigger helpKey="admin.form.notification-rules" label="Help for adding notification rules" [grouped]="true" />
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      <!-- Overlap warnings -->
      <app-overlap-warning-panel [rules]="rules()" />

      <!-- Empty state -->
      @if (!loading() && rules().length === 0) {
        <div class="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          <p class="text-gray-500 font-medium">No notification rules yet</p>
          <p class="text-gray-400 text-sm mt-1">Add a rule to send email notifications based on submission field values.</p>
          <button type="button" (click)="addRule()"
            class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
            + Add your first rule
          </button>
        </div>
      }

      <!-- Rules list -->
      <div class="space-y-3">
      @for (rule of rules(); track rule.id) {
        <app-notification-rule-card
          [rule]="rule"
          [formFields]="formFields"
          [placeholderCategories]="allPlaceholderCategories"
          (ruleChange)="saveRule(rule.id, $event)"
          (delete)="deleteRule(rule.id)"
        />
      }
      </div>

    </div>
  `
})
export class NotificationRulesEditorComponent implements OnInit, OnChanges {
  @Input() formId!: number;
  @Input() formSchema: any = null; // Formio schema — used to extract field list + field placeholders

  private svc = inject(NotificationRulesService);

  rules = signal<NotificationRule[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  formFields: FormField[] = [];
  allPlaceholderCategories: PlaceholderCategory[] = buildPlaceholderCategories();

  ngOnInit() {
    if (this.formId) this.load();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['formSchema'] && this.formSchema) {
      this.extractFormFields();
    }
    if (changes['formId'] && this.formId && !changes['formId'].firstChange) {
      this.load();
    }
  }

  private load() {
    this.loading.set(true);
    this.error.set(null);
    this.svc.list(this.formId).subscribe({
      next: rules => { this.rules.set(rules); this.loading.set(false); },
      error: () => { this.error.set('Failed to load notification rules.'); this.loading.set(false); }
    });
  }

  private extractFormFields() {
    this.formFields = extractFormioFields(this.formSchema);
    this.allPlaceholderCategories = buildPlaceholderCategories(this.formFields);
  }

  addRule() {
    const newRule: SaveNotificationRuleRequest = {
      name: 'New Rule',
      enabled: true,
      channel: 'email',
      condition_group: { operator: 'AND', children: [] } as ConditionGroup,
      sort_order: this.rules().length,
      email_config: { to_addresses: [], subject: '', body_html: '', attach_pdf: false }
    };

    this.svc.create(this.formId, newRule).subscribe({
      next: rule => this.rules.update(list => [...list, rule]),
      error: () => this.error.set('Failed to create rule.')
    });
  }

  saveRule(id: number, updated: NotificationRule) {
    const req: SaveNotificationRuleRequest = {
      name: updated.name,
      enabled: updated.enabled,
      channel: updated.channel,
      condition_group: updated.condition_group,
      sort_order: updated.sort_order,
      email_config: updated.email_config
    };

    this.svc.update(this.formId, id, req).subscribe({
      next: rule => this.rules.update(list => list.map(r => r.id === id ? rule : r)),
      error: () => this.error.set('Failed to save rule.')
    });
  }

  deleteRule(id: number) {
    if (!confirm('Delete this notification rule?')) return;
    this.svc.delete(this.formId, id).subscribe({
      next: () => this.rules.update(list => list.filter(r => r.id !== id)),
      error: () => this.error.set('Failed to delete rule.')
    });
  }
}

