import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConditionGroup, ConditionLeaf, ConditionOperator, isConditionGroup } from '../../../core/models';

export interface FormField {
  key: string;
  label: string;
  type: string; // 'text' | 'number' | 'boolean' | 'select' | etc.
}

const CONDITION_OPERATORS: { value: ConditionOperator; label: string; forTypes?: string[] }[] = [
  { value: 'equals',               label: 'equals' },
  { value: 'not_equals',           label: 'does not equal' },
  { value: 'contains',             label: 'contains' },
  { value: 'greater_than',         label: 'greater than',          forTypes: ['number'] },
  { value: 'less_than',            label: 'less than',             forTypes: ['number'] },
  { value: 'greater_than_or_equal',label: 'greater than or equal', forTypes: ['number'] },
  { value: 'less_than_or_equal',   label: 'less than or equal',    forTypes: ['number'] },
  { value: 'is_empty',             label: 'is empty' },
  { value: 'is_not_empty',         label: 'is not empty' },
];

@Component({
  selector: 'app-condition-group-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-2">
      <!-- Group header -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">Match</span>
        <select
          [ngModel]="group.operator"
          (ngModelChange)="setOperator($event)"
          class="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="AND">ALL (AND)</option>
          <option value="OR">ANY (OR)</option>
        </select>
        <span class="text-sm text-gray-500">of the following</span>
        @if (depth > 0) {
          <button type="button" (click)="remove.emit()" class="ml-auto text-gray-400 hover:text-red-500 transition-colors" title="Remove group">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        }
      </div>

      <!-- Children -->
      <div class="pl-4 border-l-2 border-gray-200 space-y-2">
        @for (child of group.children; track $index) {
          @if (isGroup(child)) {
            <div class="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <app-condition-group-editor
                [group]="asGroup(child)"
                [fields]="fields"
                [depth]="depth + 1"
                (groupChange)="updateChild($index, $event)"
                (remove)="removeChild($index)"
              />
            </div>
          } @else {
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Field selector -->
              <select
                [ngModel]="asLeaf(child).fieldKey"
                (ngModelChange)="updateLeafField($index, $event)"
                class="text-sm border border-gray-300 rounded-md px-2 py-1.5 min-w-[160px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— select field —</option>
                @for (field of fields; track field.key) {
                  <option [value]="field.key">{{ field.label }}</option>
                }
              </select>

              <!-- Operator selector -->
              <select
                [ngModel]="asLeaf(child).conditionOperator"
                (ngModelChange)="updateLeafOperator($index, $event)"
                class="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                @for (op of operatorsFor(asLeaf(child).fieldKey); track op.value) {
                  <option [value]="op.value">{{ op.label }}</option>
                }
              </select>

              <!-- Value input (hidden for is_empty / is_not_empty) -->
              @if (!['is_empty','is_not_empty'].includes(asLeaf(child).conditionOperator)) {
                @if (fieldType(asLeaf(child).fieldKey) === 'boolean') {
                  <select
                    [ngModel]="asLeaf(child).value"
                    (ngModelChange)="updateLeafValue($index, $event)"
                    class="text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option [value]="true">Yes</option>
                    <option [value]="false">No</option>
                  </select>
                } @else {
                  <input
                    type="{{ fieldType(asLeaf(child).fieldKey) === 'number' ? 'number' : 'text' }}"
                    [ngModel]="asLeaf(child).value"
                    (ngModelChange)="updateLeafValue($index, $event)"
                    placeholder="value"
                    class="text-sm border border-gray-300 rounded-md px-2 py-1.5 w-32 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                }
              }

              <button type="button" (click)="removeChild($index)" class="text-gray-400 hover:text-red-500 transition-colors ml-auto" title="Remove condition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
          }
        }

        <!-- Add actions -->
        <div class="flex items-center gap-2 pt-1">
          <button type="button" (click)="addCondition()"
            class="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add Condition
          </button>
          @if (depth < 3) {
            <span class="text-gray-300">|</span>
            <button type="button" (click)="addGroup()"
              class="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Add Group
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class ConditionGroupEditorComponent implements OnChanges {
  @Input() group: ConditionGroup = { operator: 'AND', children: [] };
  @Input() fields: FormField[] = [];
  @Input() depth = 0;
  @Output() groupChange = new EventEmitter<ConditionGroup>();
  @Output() remove = new EventEmitter<void>();

  isGroup = isConditionGroup;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['group'] && !this.group) {
      this.group = { operator: 'AND', children: [] };
    }
  }

  asGroup(node: any): ConditionGroup { return node as ConditionGroup; }
  asLeaf(node: any): ConditionLeaf { return node as ConditionLeaf; }

  setOperator(op: 'AND' | 'OR') {
    this.emit({ ...this.group, operator: op });
  }

  addCondition() {
    const firstField = this.fields[0];
    const leaf: ConditionLeaf = { fieldKey: firstField?.key ?? '', conditionOperator: 'equals', value: '' };
    this.emit({ ...this.group, children: [...this.group.children, leaf] });
  }

  addGroup() {
    const subGroup: ConditionGroup = { operator: 'OR', children: [] };
    this.emit({ ...this.group, children: [...this.group.children, subGroup] });
  }

  removeChild(index: number) {
    const children = this.group.children.filter((_, i) => i !== index);
    this.emit({ ...this.group, children });
  }

  updateChild(index: number, updated: ConditionGroup) {
    const children = [...this.group.children];
    children[index] = updated;
    this.emit({ ...this.group, children });
  }

  updateLeafField(index: number, fieldKey: string) {
    this.updateLeaf(index, { fieldKey, conditionOperator: 'equals', value: '' });
  }

  updateLeafOperator(index: number, conditionOperator: ConditionOperator) {
    const leaf = this.asLeaf(this.group.children[index]);
    this.updateLeaf(index, { ...leaf, conditionOperator });
  }

  updateLeafValue(index: number, value: any) {
    const leaf = this.asLeaf(this.group.children[index]);
    this.updateLeaf(index, { ...leaf, value });
  }

  private updateLeaf(index: number, leaf: ConditionLeaf) {
    const children = [...this.group.children];
    children[index] = leaf;
    this.emit({ ...this.group, children });
  }

  operatorsFor(fieldKey: string): typeof CONDITION_OPERATORS {
    const type = this.fieldType(fieldKey);
    return CONDITION_OPERATORS.filter(op => !op.forTypes || op.forTypes.includes(type));
  }

  fieldType(fieldKey: string): string {
    return this.fields.find(f => f.key === fieldKey)?.type ?? 'text';
  }

  private emit(group: ConditionGroup) {
    this.group = group;
    this.groupChange.emit(group);
  }
}
