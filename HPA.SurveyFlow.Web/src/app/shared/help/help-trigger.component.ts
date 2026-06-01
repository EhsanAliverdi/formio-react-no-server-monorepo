import { Component, inject, input } from '@angular/core';
import { HelpService } from './help.service';

@Component({
  selector: 'app-help-trigger',
  standalone: true,
  template: `
    <button
      type="button"
      [class]="grouped()
        ? 'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-r-lg border border-gray-300 bg-white text-indigo-500 transition hover:bg-gray-50 hover:text-indigo-700 focus:z-10 focus:outline-none focus:ring-2 focus:ring-indigo-500'
        : 'inline-flex h-5 w-5 shrink-0 items-center justify-center text-indigo-500 transition hover:text-indigo-700 focus:outline-none'"
      [attr.aria-label]="label()"
      (click)="openHelp($event)">
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    </button>
  `,
})
export class HelpTriggerComponent {
  helpKey = input.required<string>();
  label = input('Open help');
  grouped = input(false);

  private help = inject(HelpService);

  openHelp(event: MouseEvent): void {
    event.stopPropagation();
    this.help.open(this.helpKey());
  }
}
