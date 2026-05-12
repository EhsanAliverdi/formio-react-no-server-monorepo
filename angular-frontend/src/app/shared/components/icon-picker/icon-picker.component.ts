import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { IconService } from '../../../core/services/icon.service';

@Component({
  selector: 'app-icon-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Modal Overlay -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      (click)="onOverlayClick($event)"
    >
      <div
        class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 class="text-lg font-semibold text-gray-900">Select Icon</h2>
          <button
            type="button"
            (click)="close()"
            class="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Controls -->
        <div class="px-6 py-3 border-b border-gray-100 flex gap-3">
          <!-- Pack selector -->
          <select
            [(ngModel)]="selectedPack"
            (ngModelChange)="onPackChange($event)"
            class="rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option *ngFor="let pack of packs()" [value]="pack.id">{{ pack.label }}</option>
          </select>

          <!-- Search -->
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange($event)"
            placeholder="Search icons..."
            class="flex-1 rounded-lg border border-gray-300 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-4">
          <!-- Loading -->
          <div *ngIf="loading()" class="flex justify-center items-center py-12">
            <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>

          <!-- No results -->
          <div *ngIf="!loading() && icons().length === 0" class="text-center py-12 text-gray-400 text-sm">
            No icons found.
          </div>

          <!-- Grid -->
          <div *ngIf="!loading() && icons().length > 0" class="grid grid-cols-8 gap-2">
            <button
              *ngFor="let icon of icons()"
              type="button"
              (click)="selectIcon(icon)"
              [title]="icon"
              class="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-indigo-50 border-2 transition group"
              [class.border-indigo-500]="isSelected(icon)"
              [class.border-transparent]="!isSelected(icon)"
            >
              <img
                [src]="getSvgUrl(selectedPack, icon)"
                [alt]="icon"
                class="w-6 h-6 object-contain"
                loading="lazy"
              />
              <span class="text-xs text-gray-500 mt-1 truncate w-full text-center leading-tight group-hover:text-indigo-600">
                {{ icon }}
              </span>
            </button>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            type="button"
            (click)="close()"
            class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  `,
})
export class IconPickerComponent implements OnInit {
  @Input() selectedIcon: string = '';
  @Output() iconSelected = new EventEmitter<string>();

  private iconService = inject(IconService);

  packs = signal<{ id: string; label: string }[]>([]);
  icons = signal<string[]>([]);
  loading = signal(false);

  selectedPack: string = '';
  searchQuery: string = '';

  private search$ = new Subject<string>();

  ngOnInit(): void {
    // Parse selected pack from selectedIcon
    if (this.selectedIcon && this.selectedIcon.includes(':')) {
      this.selectedPack = this.selectedIcon.split(':')[0];
    }

    // Load packs
    this.iconService.getPacks().subscribe({
      next: (res) => {
        this.packs.set(res.items);
        if (!this.selectedPack && res.items.length > 0) {
          this.selectedPack = res.items[0].id;
        }
        this.loadIcons();
      },
      error: () => {
        this.packs.set([]);
      },
    });

    // Debounced search
    this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(q => {
      this.loadIcons(q);
    });
  }

  onPackChange(packId: string): void {
    this.selectedPack = packId;
    this.loadIcons(this.searchQuery);
  }

  onSearchChange(q: string): void {
    this.search$.next(q);
  }

  loadIcons(q?: string): void {
    if (!this.selectedPack) return;
    this.loading.set(true);
    this.iconService.search(this.selectedPack, q || undefined, 80).subscribe({
      next: (res) => {
        this.icons.set(res.items);
        this.loading.set(false);
      },
      error: () => {
        this.icons.set([]);
        this.loading.set(false);
      },
    });
  }

  getSvgUrl(packId: string, name: string): string {
    return this.iconService.getSvgUrl(packId, name);
  }

  isSelected(iconName: string): boolean {
    return this.selectedIcon === `${this.selectedPack}:${iconName}`;
  }

  selectIcon(iconName: string): void {
    const value = `${this.selectedPack}:${iconName}`;
    this.iconSelected.emit(value);
  }

  close(): void {
    this.iconSelected.emit(this.selectedIcon);
  }

  onOverlayClick(event: MouseEvent): void {
    this.close();
  }
}
