import { Component, Input, OnInit, OnChanges, SimpleChanges, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IntegrationRule, SaveIntegrationRuleRequest, ConditionGroup
} from '../../../../core/models';
import { IntegrationRulesService } from '../../../../core/services/integration-rules.service';
import { FormField } from '../../../../shared/components/condition-group-editor/condition-group-editor.component';
import { IntegrationRuleCardComponent } from '../integration-rule-card/integration-rule-card.component';
import { extractFormioFields } from '../../../../core/utils/formio-fields';

@Component({
  selector: 'app-integration-rules-editor',
  standalone: true,
  imports: [CommonModule, IntegrationRuleCardComponent],
  template: `
    <div class="space-y-4">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-gray-900">Integration Rules</h3>
          <p class="text-sm text-gray-500 mt-0.5">
            Define conditions that trigger integrations (MEX, webhooks) when a form is submitted.
            Runs alongside any existing integration config in the form schema.
          </p>
        </div>
        <button type="button" (click)="addRule()"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          Add Rule
        </button>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }

      <!-- Error -->
      @if (error()) {
        <div class="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {{ error() }}
        </div>
      }

      <!-- Empty state -->
      @if (!loading() && rules().length === 0) {
        <div class="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <svg class="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M13 10V3L4 14h7v7l9-11h-7z"/>
          </svg>
          <p class="text-gray-500 font-medium">No integration rules yet</p>
          <p class="text-gray-400 text-sm mt-1">Add a rule to trigger MEX or webhook integrations based on submission field values.</p>
          <button type="button" (click)="addRule()"
            class="mt-4 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors">
            + Add your first rule
          </button>
        </div>
      }

      <!-- Rules list -->
      <div class="space-y-3">
      @for (rule of rules(); track rule.id) {
        <app-integration-rule-card
          [rule]="rule"
          [formFields]="formFields"
          (ruleChange)="saveRule(rule.id, $event)"
          (delete)="deleteRule(rule.id)" />
      }
      </div>

    </div>
  `
})
export class IntegrationRulesEditorComponent implements OnInit, OnChanges {
  @Input() formId!: number;
  @Input() formSchema: any = null;

  private svc = inject(IntegrationRulesService);

  rules = signal<IntegrationRule[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  formFields: FormField[] = [];

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
      error: () => { this.error.set('Failed to load integration rules.'); this.loading.set(false); }
    });
  }

  private extractFormFields() {
    if (!this.formSchema?.components) return;
    this.formFields = extractFormioFields(this.formSchema);
  }

  addRule() {
    const newRule: SaveIntegrationRuleRequest = {
      name: 'New Rule',
      enabled: true,
      channel: 'mex',
      condition_group: { operator: 'AND', children: [] } as ConditionGroup,
      sort_order: this.rules().length,
      mex_config: { action: 'create_request', field_mappings: {} },
    };

    this.svc.create(this.formId, newRule).subscribe({
      next: rule => this.rules.update(list => [...list, rule]),
      error: () => this.error.set('Failed to create integration rule.')
    });
  }

  saveRule(id: number, updated: IntegrationRule) {
    const req: SaveIntegrationRuleRequest = {
      name: updated.name,
      enabled: updated.enabled,
      channel: updated.channel,
      condition_group: updated.condition_group,
      sort_order: updated.sort_order,
      mex_config: updated.mex_config,
      webhook_config: updated.webhook_config,
    };

    this.svc.update(this.formId, id, req).subscribe({
      next: rule => this.rules.update(list => list.map(r => r.id === id ? rule : r)),
      error: () => this.error.set('Failed to save integration rule.')
    });
  }

  deleteRule(id: number) {
    if (!confirm('Delete this integration rule?')) return;
    this.svc.delete(this.formId, id).subscribe({
      next: () => this.rules.update(list => list.filter(r => r.id !== id)),
      error: () => this.error.set('Failed to delete integration rule.')
    });
  }
}

