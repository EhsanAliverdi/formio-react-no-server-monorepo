import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-card',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    .card-root {
      transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease;
    }
    .card-root:hover {
      transform: translateY(-6px) scale(1.02);
      box-shadow: 0 24px 48px -8px rgba(0,0,0,0.22), 0 8px 20px -4px rgba(0,0,0,0.10);
    }
    .card-img {
      transition: transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94);
    }
    .card-root:hover .card-img {
      transform: scale(1.08);
    }
    .card-overlay {
      transition: opacity 0.35s ease;
      opacity: 0;
    }
    .card-root:hover .card-overlay {
      opacity: 1;
    }
    .card-content {
      transition: transform 0.35s cubic-bezier(0.34,1.2,0.64,1), opacity 0.3s ease;
      transform: translateY(12px);
      opacity: 0;
    }
    .card-root:hover .card-content {
      transform: translateY(0);
      opacity: 1;
    }
    .card-btn {
      transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    }
    .card-btn:hover {
      transform: scale(1.03);
      box-shadow: 0 4px 16px rgba(37,99,235,0.45);
    }
    .card-btn:active {
      transform: scale(0.97);
    }
    /* Preview mode: disable hover effects */
    :host(.preview-mode) .card-root:hover {
      transform: none;
      box-shadow: none;
    }
    :host(.preview-mode) .card-root:hover .card-img { transform: none; }
    :host(.preview-mode) .card-root:hover .card-overlay { opacity: 0; }
    :host(.preview-mode) .card-root:hover .card-content { transform: translateY(12px); opacity: 0; }
  `],
  template: `
    <div class="card-root relative block w-full rounded-2xl overflow-hidden shadow-md cursor-pointer select-none"
         style="aspect-ratio: 4/3;">

      <!-- Background: image, icon, or placeholder -->
      @if (imageUrl) {
        <img [src]="imageUrl" [alt]="name"
          class="card-img absolute inset-0 w-full h-full object-contain bg-white" />
      } @else if (iconSvgUrl) {
        <div class="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <img [src]="iconSvgUrl" [alt]="name"
            class="card-img w-28 h-28 object-contain" />
        </div>
      } @else {
        <div class="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
          <svg class="card-img w-20 h-20 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      }

      <!-- Hover overlay -->
      <div class="card-overlay absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10 flex flex-col justify-between p-5 pointer-events-none">
        @if (showTitle && name) {
          <div class="card-content pointer-events-none text-white font-bold text-lg leading-tight tracking-tight drop-shadow">{{ name }}</div>
        }
        <div class="card-content pointer-events-auto mt-auto">
          @if (showDescription && description) {
            <p class="text-white/80 text-sm leading-relaxed mb-4 drop-shadow">{{ description }}</p>
          }
          <span class="card-btn inline-flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2.5">
            {{ buttonText || 'Start' }}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>

    </div>
  `,
})
export class FormCardComponent {
  @Input() name = '';
  @Input() description: string | null = null;
  @Input() imageUrl: string | null = null;
  @Input() iconSvgUrl: string | null = null;
  @Input() showTitle = true;
  @Input() showDescription = true;
  @Input() buttonText = 'Start';
}
