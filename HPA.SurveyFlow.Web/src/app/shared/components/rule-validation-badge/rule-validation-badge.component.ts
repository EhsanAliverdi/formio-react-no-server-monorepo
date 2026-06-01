import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConditionGroup, ConditionLeaf, isConditionGroup } from '../../../core/models';

export interface RuleValidationIssue {
  type: 'missing_field' | 'empty_condition';
  fieldKey?: string;
  message: string;
}

@Component({
  selector: 'app-rule-validation-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (issues.length > 0) {
      <details class="relative inline-block">
        <summary class="inline-flex cursor-pointer list-none items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          {{ issues.length }} issue{{ issues.length > 1 ? 's' : '' }}
        </summary>

        <div class="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg bg-gray-900 p-3 text-xs text-white shadow-lg">
          <p class="font-semibold mb-1.5">Rule issues:</p>
          <ul class="space-y-1">
            @for (issue of issues; track issue.message) {
              <li class="flex items-start gap-1.5">
                <span class="text-amber-400 mt-0.5 shrink-0">•</span>
                <span>{{ issue.message }}</span>
              </li>
            }
          </ul>
          <div class="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </details>
    } @else {
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
        <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
        </svg>
        Valid
      </span>
    }
  `
})
export class RuleValidationBadgeComponent implements OnChanges {
  @Input() conditionGroup!: ConditionGroup;
  @Input() availableFieldKeys: string[] = [];

  issues: RuleValidationIssue[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (changes['conditionGroup'] || changes['availableFieldKeys']) {
      this.validate();
    }
  }

  private validate() {
    this.issues = [];
    if (this.conditionGroup) {
      this.validateNode(this.conditionGroup);
    }
  }

  private validateNode(node: ConditionGroup | ConditionLeaf) {
    if (isConditionGroup(node)) {
      if (node.children.length === 0) {
        this.issues.push({ type: 'empty_condition', message: 'A condition group has no conditions' });
      }
      node.children.forEach(child => this.validateNode(child));
    } else {
      if (!node.fieldKey) {
        this.issues.push({ type: 'empty_condition', message: 'A condition has no field selected' });
      } else if (this.availableFieldKeys.length > 0 && !this.availableFieldKeys.includes(node.fieldKey)) {
        this.issues.push({
          type: 'missing_field',
          fieldKey: node.fieldKey,
          message: `Field "${node.fieldKey}" no longer exists in this form`
        });
      }
    }
  }
}
