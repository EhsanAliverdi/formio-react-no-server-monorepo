import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IntegrationRule, IntegrationRuleMexConfig, IntegrationRuleWebhookConfig, ConditionGroup
} from '../../../../core/models';
import { FormField } from '../../../../shared/components/condition-group-editor/condition-group-editor.component';
import { ConditionGroupEditorComponent } from '../../../../shared/components/condition-group-editor/condition-group-editor.component';
import { RuleValidationBadgeComponent } from '../../../../shared/components/rule-validation-badge/rule-validation-badge.component';
import { IntegrationRuleMexConfigComponent } from '../../../../shared/components/integration-rule-mex-config/integration-rule-mex-config.component';
import { IntegrationRuleWebhookConfigComponent } from '../../../../shared/components/integration-rule-webhook-config/integration-rule-webhook-config.component';
import { HelpTriggerComponent } from '../../../../shared/help/help-trigger.component';

@Component({
  selector: 'app-integration-rule-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConditionGroupEditorComponent,
    RuleValidationBadgeComponent,
    IntegrationRuleMexConfigComponent,
    IntegrationRuleWebhookConfigComponent,
    HelpTriggerComponent,
  ],
  template: `
    <div class="relative border rounded-xl overflow-hidden transition-all hover:z-10"
         [class.border-gray-200]="!expanded()"
         [class.border-indigo-300]="expanded()"
         [class.shadow-sm]="!expanded()"
         [class.shadow-md]="expanded()"
         [class.z-10]="expanded()">

      <!-- Card header -->
      <div class="flex items-center gap-3 px-4 py-3 bg-white cursor-pointer hover:bg-gray-50 transition-colors"
           (click)="toggleExpand()">

        <svg class="w-4 h-4 text-gray-300 shrink-0 cursor-grab" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
        </svg>

        <!-- Enable toggle -->
        <label class="relative inline-flex items-center cursor-pointer" (click)="$event.stopPropagation()">
          <input type="checkbox" class="sr-only peer"
            [ngModel]="draft.enabled"
            (ngModelChange)="patchDraft({ enabled: $event })"/>
          <div class="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
        </label>

        <!-- Rule name -->
        @if (expanded()) {
          <input type="text" [ngModel]="draft.name" (ngModelChange)="patchDraft({ name: $event })"
            (click)="$event.stopPropagation()" placeholder="Rule name"
            class="flex-1 text-sm font-medium text-gray-900 border-0 border-b border-gray-300 focus:border-indigo-500 focus:outline-none bg-transparent py-0.5" />
          <app-help-trigger helpKey="admin.form.rule-basics" label="Help for rule name and status" />
        } @else {
          <span class="flex-1 text-sm font-medium text-gray-900 truncate">{{ draft.name || 'Unnamed rule' }}</span>
          <app-help-trigger helpKey="admin.form.rule-basics" label="Help for rule name and status" />
        }

        <!-- Channel badge -->
        <span class="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              [class.bg-indigo-100]="draft.channel === 'mex'"
              [class.text-indigo-800]="draft.channel === 'mex'"
              [class.bg-purple-100]="draft.channel === 'webhook'"
              [class.text-purple-800]="draft.channel === 'webhook'">
          {{ draft.channel === 'mex' ? 'MEX' : 'Webhook' }}
        </span>

        <!-- Validation badge -->
        <app-rule-validation-badge
          [conditionGroup]="draft.condition_group"
          [availableFieldKeys]="formFieldKeys"
          (click)="$event.stopPropagation()" />

        <!-- Chevron -->
        <svg class="w-4 h-4 text-gray-400 transition-transform shrink-0" [class.rotate-180]="expanded()"
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>

        <!-- Delete -->
        <button type="button" (click)="$event.stopPropagation(); delete.emit()"
          class="shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors rounded" title="Delete rule">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
      </div>

      <!-- Expanded content -->
      @if (expanded()) {
        <div class="border-t border-gray-100 bg-white px-4 pb-4 pt-4 space-y-6">

          <!-- Step 1: Conditions -->
          <div>
            <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">1</span>
              Trigger Conditions <app-help-trigger helpKey="admin.form.rule-conditions" label="Help for trigger conditions" />
            </h4>
            <app-condition-group-editor
              [group]="draft.condition_group"
              [fields]="formFields"
              [depth]="0"
              (groupChange)="patchDraft({ condition_group: $event })" />
          </div>

          <!-- Step 2: Channel + Config -->
          <div class="border-t border-gray-100 pt-4">
            <h4 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">2</span>
              Integration Channel <app-help-trigger helpKey="admin.form.integration-channel" label="Help for integration channel" />
            </h4>

            <!-- Channel selector -->
            <div class="flex gap-3 mb-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="channel-{{draft.id}}" value="mex"
                  [ngModel]="draft.channel" (ngModelChange)="patchDraft({ channel: $event })" />
                <span class="text-sm font-medium text-gray-700">MEX Maintenance</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="channel-{{draft.id}}" value="webhook"
                  [ngModel]="draft.channel" (ngModelChange)="patchDraft({ channel: $event })" />
                <span class="text-sm font-medium text-gray-700">Webhook</span>
              </label>
            </div>

            @if (draft.channel === 'mex') {
              <app-integration-rule-mex-config
                [config]="mexConfig"
                [formFields]="formFields"
                (configChange)="patchDraft({ mex_config: $event })" />
            }
            @if (draft.channel === 'webhook') {
              <app-integration-rule-webhook-config
                [config]="webhookConfig"
                [formFields]="formFields"
                (configChange)="patchDraft({ webhook_config: $event })" />
            }
          </div>

          <!-- Save / Cancel -->
          <div class="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" (click)="cancelEdit()"
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors">
              Cancel
            </button>
            <button type="button" (click)="save()"
              class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors">
              Save Rule
            </button>
          </div>
        </div>
      }
    </div>
  `
})
export class IntegrationRuleCardComponent implements OnChanges {
  @Input() rule!: IntegrationRule;
  @Input() formFields: FormField[] = [];
  @Output() ruleChange = new EventEmitter<IntegrationRule>();
  @Output() delete = new EventEmitter<void>();

  expanded = signal(false);
  draft!: IntegrationRule;
  private original!: IntegrationRule;

  get formFieldKeys(): string[] { return this.formFields.map(f => f.key); }

  get mexConfig(): IntegrationRuleMexConfig {
    return this.draft.mex_config ?? { action: 'create_request', field_mappings: {} };
  }

  get webhookConfig(): IntegrationRuleWebhookConfig {
    return this.draft.webhook_config ?? { url: '', method: 'POST', headers: [], body_template: '' };
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rule'] && this.rule) {
      this.draft = structuredClone(this.rule);
      this.original = structuredClone(this.rule);
    }
  }

  toggleExpand() { this.expanded.update(v => !v); }

  patchDraft(patch: Partial<IntegrationRule>) {
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
