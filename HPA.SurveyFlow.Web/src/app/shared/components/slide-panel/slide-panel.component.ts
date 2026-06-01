import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';
import { SlidePanelService } from './slide-panel.service';

@Component({
  selector: 'app-slide-panel',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'translateX(100%)' })),
      ]),
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
  ],
  template: `
    @for (s of svc.panels(); track s.id; let index = $index; let isTop = $last) {
      <!-- Backdrop -->
      <div
        @fadeIn
        class="fixed inset-0 bg-black/40 backdrop-blur-sm"
        [style.z-index]="900 + index * 2"
        aria-hidden="true"
        (click)="svc.close(s.id)">
      </div>

      <!-- Panel -->
      <aside
        @slideIn
        role="dialog"
        [attr.aria-modal]="isTop ? 'true' : null"
        [attr.aria-hidden]="isTop ? null : 'true'"
        [attr.aria-label]="s.config.title"
        class="fixed inset-y-0 right-0 flex flex-col bg-white shadow-2xl
               w-full sm:w-[480px] lg:w-[580px] xl:w-[680px] 2xl:w-[760px]"
        [style.z-index]="901 + index * 2"
        [class]="s.config.width ?? ''">

        <!-- Header -->
        <div class="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4 shrink-0">
          <div class="min-w-0">
            <h2 class="truncate text-base font-semibold text-gray-900">{{ s.config.title }}</h2>
            @if (s.config.subtitle) {
              <p class="mt-0.5 truncate text-sm text-gray-500">{{ s.config.subtitle }}</p>
            }
          </div>
          <button
            type="button"
            class="ml-auto shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            aria-label="Close panel"
            (click)="svc.close(s.id)">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Scrollable content -->
        <div class="flex-1 overflow-y-auto px-6 py-5">
          @if (s.template) {
            <ng-container *ngTemplateOutlet="s.template; context: s.context ?? {}"></ng-container>
          }
          @if (s.component) {
            <ng-container *ngComponentOutlet="s.component; inputs: s.componentInputs ?? {}"></ng-container>
          }
        </div>
      </aside>
    }
  `,
})
export class SlidePanelComponent {
  svc = inject(SlidePanelService);

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.svc.state()) this.svc.close();
  }
}
