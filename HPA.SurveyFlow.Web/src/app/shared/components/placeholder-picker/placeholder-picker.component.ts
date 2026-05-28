import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlaceholderCategory, PlaceholderDef } from '../../../core/models';

@Component({
  selector: 'app-placeholder-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="relative inline-block">
      <button
        type="button"
        (click)="toggleOpen()"
        class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"/>
        </svg>
        Insert Placeholder
        <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      @if (open()) {
        <!-- Backdrop -->
        <div class="fixed inset-0 z-30" (click)="open.set(false)"></div>

        <!-- Dropdown panel -->
        <div class="absolute z-40 mt-1 w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden"
             [class.right-0]="alignRight"
             [class.left-0]="!alignRight">

          <!-- Search -->
          <div class="p-2 border-b border-gray-100">
            <input
              type="text"
              [(ngModel)]="searchTerm"
              placeholder="Search placeholders..."
              class="w-full text-sm px-3 py-1.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <!-- Categories -->
          <div class="max-h-72 overflow-y-auto">
            @for (category of filteredCategories(); track category.label) {
              <div>
                <div class="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                  {{ category.label }}
                </div>
                @for (ph of category.placeholders; track ph.key) {
                  <button
                    type="button"
                    (click)="select(ph)"
                    class="w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors group"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <span class="text-xs font-mono text-blue-700 group-hover:text-blue-900 shrink-0">{{'{{'}}{{ph.key}}{{'}}'}}</span>
                      <span class="text-xs text-gray-500 text-right leading-tight">{{ ph.label }}</span>
                    </div>
                    @if (ph.description) {
                      <p class="text-xs text-gray-400 mt-0.5 truncate">{{ ph.description }}</p>
                    }
                  </button>
                }
              </div>
            }
            @if (filteredCategories().length === 0) {
              <p class="px-3 py-4 text-sm text-gray-400 text-center">No placeholders found</p>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class PlaceholderPickerComponent {
  @Input() categories: PlaceholderCategory[] = [];
  @Input() alignRight = false;
  @Output() placeholderSelected = new EventEmitter<PlaceholderDef>();

  open = signal(false);
  searchTerm = '';

  toggleOpen() { this.open.update(v => !v); }

  filteredCategories(): PlaceholderCategory[] {
    const term = this.searchTerm.toLowerCase().trim();
    if (!term) return this.categories;
    return this.categories
      .map(cat => ({
        ...cat,
        placeholders: cat.placeholders.filter(p =>
          p.key.toLowerCase().includes(term) ||
          p.label.toLowerCase().includes(term) ||
          (p.description?.toLowerCase().includes(term) ?? false)
        )
      }))
      .filter(cat => cat.placeholders.length > 0);
  }

  select(ph: PlaceholderDef) {
    this.placeholderSelected.emit(ph);
    this.open.set(false);
    this.searchTerm = '';
  }
}
