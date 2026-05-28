import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FieldDescriptor, FieldDriftEntry, ReportColumnDefinition } from '../../../core/models';

export interface DriftResolution {
  /** fieldKey of the drifted column */
  fieldKey: string;
  /** 'keep' | 'remove' | 'remap' */
  action: 'keep' | 'remove' | 'remap';
  /** new field key when action = 'remap' */
  remapTo?: string;
}

@Component({
  selector: 'app-report-drift-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
      <!-- Header -->
      <div class="flex items-center gap-3 px-4 py-3 border-b border-amber-200 dark:border-amber-700">
        <svg class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        <div class="flex-1">
          <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">Schema drift detected</p>
          <p class="text-xs text-amber-700 dark:text-amber-400">{{ driftEntries.length }} column{{ driftEntries.length !== 1 ? 's' : '' }} affected by form schema changes.</p>
        </div>
        <button type="button" (click)="dismissed = !dismissed"
          class="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200 text-xs font-medium">
          {{ dismissed ? 'Show' : 'Hide' }}
        </button>
      </div>

      @if (!dismissed) {
        <!-- Drift entries table -->
        <div class="divide-y divide-amber-100 dark:divide-amber-800/50">
          @for (entry of driftEntries; track entry.field_key) {
            <div class="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ entry.label }}</span>
                  <code class="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded font-mono">{{ entry.field_key }}</code>
                  <span class="text-xs px-2 py-0.5 rounded-full font-medium"
                    [class]="entry.drift_type === 'missing'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'">
                    {{ entry.drift_type === 'missing' ? 'Missing' : entry.drift_type === 'type_changed' ? 'Type changed' : 'Parent changed' }}
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{{ entry.message }}</p>
              </div>

              <!-- Resolution controls -->
              <div class="flex items-center gap-2 flex-shrink-0">
                <select
                  [ngModel]="getResolution(entry.field_key).action"
                  (ngModelChange)="setAction(entry.field_key, $event)"
                  class="ta-field text-xs h-8 w-28 py-0">
                  <option value="keep">Keep column</option>
                  <option value="remove">Remove</option>
                  <option value="remap">Remap to…</option>
                </select>

                @if (getResolution(entry.field_key).action === 'remap') {
                  <select
                    [ngModel]="getResolution(entry.field_key).remapTo"
                    (ngModelChange)="setRemapTo(entry.field_key, $event)"
                    class="ta-field text-xs h-8 w-40 py-0">
                    <option value="">— pick field —</option>
                    @for (f of availableFields; track f.key) {
                      <option [value]="f.key">{{ f.label }}</option>
                    }
                  </select>
                }
              </div>
            </div>
          }
        </div>

        <!-- Apply button -->
        <div class="px-4 py-3 border-t border-amber-200 dark:border-amber-700 flex items-center justify-between gap-3">
          <p class="text-xs text-amber-700 dark:text-amber-400">
            Saving the template will clear this warning. Columns marked "Keep" will remain but may return empty values.
          </p>
          <button type="button" (click)="applyResolutions()"
            class="ta-btn ta-btn-primary text-xs h-8 px-4 flex-shrink-0">
            Apply & Continue
          </button>
        </div>
      }
    </div>
  `,
})
export class ReportDriftWizardComponent implements OnChanges {
  @Input() driftEntries: FieldDriftEntry[] = [];
  @Input() availableFields: FieldDescriptor[] = [];
  @Input() columns: ReportColumnDefinition[] = [];
  @Output() columnsChange = new EventEmitter<ReportColumnDefinition[]>();

  dismissed = false;
  resolutions: Map<string, DriftResolution> = new Map();

  ngOnChanges(): void {
    // Initialise all entries to 'keep' if not already set
    for (const entry of this.driftEntries)
      if (!this.resolutions.has(entry.field_key))
        this.resolutions.set(entry.field_key, { fieldKey: entry.field_key, action: 'keep' });
  }

  getResolution(fieldKey: string): DriftResolution {
    return this.resolutions.get(fieldKey) ?? { fieldKey, action: 'keep' };
  }

  setAction(fieldKey: string, action: 'keep' | 'remove' | 'remap'): void {
    const r = this.getResolution(fieldKey);
    this.resolutions.set(fieldKey, { ...r, action, remapTo: action === 'remap' ? r.remapTo : undefined });
  }

  setRemapTo(fieldKey: string, remapTo: string): void {
    const r = this.getResolution(fieldKey);
    this.resolutions.set(fieldKey, { ...r, remapTo });
  }

  applyResolutions(): void {
    let updated = [...this.columns];

    for (const [fieldKey, res] of this.resolutions) {
      if (res.action === 'remove')
        updated = updated.filter(c => c.field_key !== fieldKey);
      else if (res.action === 'remap' && res.remapTo) {
        const idx = updated.findIndex(c => c.field_key === fieldKey);
        if (idx !== -1) {
          const targetField = this.availableFields.find(f => f.key === res.remapTo);
          updated[idx] = {
            ...updated[idx],
            field_key: res.remapTo,
            label: targetField?.label ?? res.remapTo,
          };
        }
      }
      // 'keep' — no change
    }

    this.columnsChange.emit(updated);
    this.dismissed = true;
  }
}
