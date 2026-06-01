import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationRule, isConditionGroup, ConditionGroup, ConditionLeaf } from '../../../../core/models';
import { HelpTriggerComponent } from '../../../../shared/help/help-trigger.component';

export interface OverlapWarning {
  recipient: string;
  ruleNames: string[];
  sharedConditionSummary?: string;
}

@Component({
  selector: 'app-overlap-warning-panel',
  standalone: true,
  imports: [CommonModule, HelpTriggerComponent],
  template: `
    @if (warnings.length > 0) {
      <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <div class="flex-1">
            <h4 class="flex items-center gap-1 text-sm font-semibold text-amber-800 mb-2">
              Overlap detected — {{ warnings.length }} recipient{{ warnings.length > 1 ? 's' : '' }} may receive duplicate emails
              <app-help-trigger helpKey="admin.form.notification-overlap" label="Help for notification overlap warning" />
            </h4>
            <div class="space-y-2">
              @for (warning of warnings; track warning.recipient) {
                <div class="text-sm text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                  <span class="font-medium">{{ warning.recipient }}</span>
                  <span class="text-amber-600"> will receive emails from </span>
                  <span class="font-medium">{{ warning.ruleNames.join(' and ') }}</span>
                  @if (warning.sharedConditionSummary) {
                    <span class="text-amber-600"> when </span>
                    <span class="font-medium italic">{{ warning.sharedConditionSummary }}</span>
                  }
                </div>
              }
            </div>
            <p class="text-xs text-amber-600 mt-2">
              This is a warning only — rules will still fire as configured. Consider adjusting conditions to make rules mutually exclusive.
            </p>
          </div>
        </div>
      </div>
    }
  `
})
export class OverlapWarningPanelComponent implements OnChanges {
  @Input() rules: NotificationRule[] = [];

  warnings: OverlapWarning[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['rules']) {
      this.detect();
    }
  }

  private detect() {
    this.warnings = [];

    const emailRules = this.rules.filter(r => r.enabled && r.channel === 'email' && r.email_config);
    if (emailRules.length < 2) return;

    const recipientMap = new Map<string, string[]>();

    for (const rule of emailRules) {
      const addresses = rule.email_config?.to_addresses ?? [];
      for (const addr of addresses) {
        const lower = addr.toLowerCase().trim();
        if (!lower) continue;
        if (!recipientMap.has(lower)) recipientMap.set(lower, []);
        recipientMap.get(lower)!.push(rule.name);
      }
    }

    for (const [recipient, ruleNames] of recipientMap) {
      if (ruleNames.length < 2) continue;

      // Best-effort: find shared leaf conditions across the overlapping rules
      const overlappingRules = emailRules.filter(r => ruleNames.includes(r.name));
      const shared = this.findSharedConditions(overlappingRules);

      this.warnings.push({ recipient, ruleNames, sharedConditionSummary: shared });
    }
  }

  private findSharedConditions(rules: NotificationRule[]): string | undefined {
    if (rules.length < 2) return undefined;

    const allLeaves = rules.map(r => this.extractLeaves(r.condition_group));
    const firstLeaves = allLeaves[0];

    // Find leaves that appear in ALL rules (same fieldKey + operator + value)
    const shared = firstLeaves.filter(leaf =>
      allLeaves.slice(1).every(leaves =>
        leaves.some(l => l.fieldKey === leaf.fieldKey && l.conditionOperator === leaf.conditionOperator)
      )
    );

    if (shared.length === 0) return undefined;
    return shared.map(l => `${l.fieldKey} ${l.conditionOperator} ${l.value ?? ''}`).join(' and ');
  }

  private extractLeaves(node: ConditionGroup | ConditionLeaf): ConditionLeaf[] {
    if (isConditionGroup(node)) {
      return node.children.flatMap(child => this.extractLeaves(child));
    }
    return [node];
  }
}
