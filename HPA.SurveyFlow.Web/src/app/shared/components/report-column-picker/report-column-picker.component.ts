import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldDescriptor, ReportColumnDefinition } from '../../../core/models';

@Component({
  selector: 'app-report-column-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-4">
      <!-- Available fields panel -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Available Fields</span>
          <span class="text-xs text-gray-400">{{ filteredAvailable.length }} fields</span>
        </div>
        <input
          type="search"
          [(ngModel)]="search"
          placeholder="Search fields…"
          class="ta-field text-sm mb-2"
        />
        <div class="border border-gray-200 rounded-lg overflow-y-auto max-h-52 bg-white">
          @if (filteredAvailable.length === 0) {
            <div class="px-3 py-4 text-sm text-gray-400 text-center">
              {{ search ? 'No fields match your search' : 'All fields are selected' }}
            </div>
          }
          @for (field of filteredAvailable; track field.key) {
            <button
              type="button"
              (click)="addColumn(field)"
              class="w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-blue-50 hover:text-blue-700 transition-colors border-b border-gray-100 last:border-0 group"
            >
              <span class="flex items-center gap-2 min-w-0">
                <span class="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold flex-shrink-0"
                  [class]="typeClass(field.type)">
                  {{ typeAbbr(field.type) }}
                </span>
                <span class="truncate font-medium text-gray-700 group-hover:text-blue-700">{{ field.label }}</span>
              </span>
              <svg class="w-4 h-4 text-gray-300 group-hover:text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
              </svg>
            </button>
          }
        </div>
      </div>

      <!-- Selected columns panel -->
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Report Columns</span>
          <span class="text-xs text-gray-400">{{ columns.length }} selected</span>
        </div>

        @if (columns.length === 0) {
          <div class="border-2 border-dashed border-gray-200 rounded-lg px-4 py-6 text-sm text-gray-400 text-center">
            Click fields above to add columns to your report
          </div>
        } @else {
          <div class="border border-gray-200 rounded-lg overflow-hidden bg-white">
            @for (col of columns; track col.field_key; let i = $index; let last = $last) {
              <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group">
                <!-- Reorder arrows -->
                <div class="flex flex-col gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    (click)="moveUp(i)"
                    [disabled]="i === 0"
                    class="flex items-center justify-center w-4 h-4 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title="Move up"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 15l7-7 7 7"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    (click)="moveDown(i)"
                    [disabled]="last"
                    class="flex items-center justify-center w-4 h-4 text-gray-300 hover:text-gray-600 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                    title="Move down"
                  >
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                    </svg>
                  </button>
                </div>

                <!-- Type badge -->
                <span class="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold flex-shrink-0"
                  [class]="typeClass(fieldType(col.field_key))">
                  {{ typeAbbr(fieldType(col.field_key)) }}
                </span>

                <!-- Editable label -->
                @if (editingIndex === i) {
                  <input
                    type="text"
                    [(ngModel)]="col.label"
                    (blur)="stopEditing()"
                    (keyup.enter)="stopEditing()"
                    (keyup.escape)="stopEditing()"
                    class="ta-field text-sm flex-1 py-1 min-w-0"
                    [id]="'col-label-' + i"
                    autofocus
                  />
                } @else {
                  <span class="text-sm font-medium text-gray-700 flex-1 min-w-0 truncate">{{ col.label }}</span>
                }

                <!-- Actions -->
                <div class="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    (click)="startEditing(i)"
                    class="p-1 text-gray-300 hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit label"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    (click)="removeColumn(i)"
                    class="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove column"
                  >
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class ReportColumnPickerComponent implements OnChanges {
  @Input() availableFields: FieldDescriptor[] = [];
  @Input() selectedColumns: ReportColumnDefinition[] = [];
  @Output() columnsChange = new EventEmitter<ReportColumnDefinition[]>();

  columns: ReportColumnDefinition[] = [];
  search = '';
  editingIndex = -1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedColumns']) {
      this.columns = this.selectedColumns.map(c => ({ ...c }));
    }
  }

  get filteredAvailable(): FieldDescriptor[] {
    const selected = new Set(this.columns.map(c => c.field_key));
    const q = this.search.toLowerCase();
    return this.availableFields.filter(f =>
      !selected.has(f.key) && (f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q))
    );
  }

  fieldType(field_key: string): string {
    return this.availableFields.find(f => f.key === field_key)?.type ?? 'text';
  }

  addColumn(field: FieldDescriptor): void {
    const updated = [...this.columns, { field_key: field.key, label: field.label }];
    this.columns = updated;
    this.emit();
  }

  removeColumn(index: number): void {
    const updated = this.columns.filter((_, i) => i !== index);
    this.columns = updated;
    this.editingIndex = -1;
    this.emit();
  }

  moveUp(index: number): void {
    if (index === 0) return;
    const updated = [...this.columns];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    this.columns = updated;
    this.emit();
  }

  moveDown(index: number): void {
    if (index >= this.columns.length - 1) return;
    const updated = [...this.columns];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    this.columns = updated;
    this.emit();
  }

  startEditing(index: number): void {
    this.editingIndex = index;
  }

  stopEditing(): void {
    this.editingIndex = -1;
    this.emit();
  }

  typeAbbr(type: string): string {
    const map: Record<string, string> = { text: 'T', number: '#', boolean: 'B', date: 'D', select: 'S' };
    return map[type] ?? 'T';
  }

  typeClass(type: string): string {
    const map: Record<string, string> = {
      text: 'bg-blue-100 text-blue-600',
      number: 'bg-green-100 text-green-700',
      boolean: 'bg-purple-100 text-purple-700',
      date: 'bg-orange-100 text-orange-700',
      select: 'bg-teal-100 text-teal-700',
    };
    return map[type] ?? 'bg-gray-100 text-gray-600';
  }

  private emit(): void {
    this.columnsChange.emit(this.columns.map(c => ({ ...c })));
  }
}
