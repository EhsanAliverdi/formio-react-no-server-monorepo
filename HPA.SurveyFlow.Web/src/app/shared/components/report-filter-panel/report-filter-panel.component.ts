import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConditionGroup, FieldDescriptor } from '../../../core/models';
import { ConditionGroupEditorComponent, FormField } from '../condition-group-editor/condition-group-editor.component';

@Component({
  selector: 'app-report-filter-panel',
  standalone: true,
  imports: [CommonModule, ConditionGroupEditorComponent],
  template: `
    <div class="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <!-- Header -->
      <button
        type="button"
        (click)="collapsible && toggleOpen()"
        [class]="collapsible
          ? 'w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors'
          : 'w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 cursor-default'"
      >
        <span class="flex items-center gap-2">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/>
          </svg>
          {{ label }}
          @if (hasActiveFilters) {
            <span class="inline-flex items-center justify-center h-5 px-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              {{ conditionCount }}
            </span>
          }
        </span>
        @if (collapsible) {
          <svg class="w-4 h-4 text-gray-400 transition-transform" [class.rotate-180]="open" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        }
      </button>

      <!-- Body -->
      @if (!collapsible || open) {
        <div class="border-t border-gray-100 px-4 py-4">
          @if (fields.length === 0) {
            <p class="text-sm text-gray-400">No fields available for filtering.</p>
          } @else {
            <app-condition-group-editor
              [group]="currentGroup"
              [fields]="formFields"
              [depth]="0"
              (groupChange)="onGroupChange($event)"
            />
          }
          @if (value && hasActiveFilters) {
            <div class="mt-3 pt-3 border-t border-gray-100 flex gap-2">
              <button type="button" (click)="clearFilters()" class="text-xs text-red-500 hover:text-red-700 transition-colors">
                Clear all filters
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ReportFilterPanelComponent implements OnChanges {
  @Input() fields: FieldDescriptor[] = [];
  @Input() value: ConditionGroup | null = null;
  @Input() label = 'Filters';
  @Input() collapsible = false;
  @Output() valueChange = new EventEmitter<ConditionGroup | null>();

  open = true;
  currentGroup: ConditionGroup = { operator: 'AND', children: [] };

  get formFields(): FormField[] {
    return this.fields.map(f => ({
      key: f.key,
      label: f.label,
      type: f.type,
      options: f.options,
    }));
  }

  get hasActiveFilters(): boolean {
    return (this.currentGroup.children?.length ?? 0) > 0;
  }

  get conditionCount(): number {
    return this.countConditions(this.currentGroup);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value']) {
      this.currentGroup = this.value ?? { operator: 'AND', children: [] };
    }
  }

  toggleOpen(): void {
    this.open = !this.open;
  }

  onGroupChange(group: ConditionGroup): void {
    this.currentGroup = group;
    this.valueChange.emit(group.children.length > 0 ? group : null);
  }

  clearFilters(): void {
    this.currentGroup = { operator: 'AND', children: [] };
    this.valueChange.emit(null);
  }

  private countConditions(group: ConditionGroup): number {
    let count = 0;
    for (const child of group.children) {
      if ('children' in child) count += this.countConditions(child as ConditionGroup);
      else count++;
    }
    return count;
  }
}
