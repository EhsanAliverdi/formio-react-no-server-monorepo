import { Injectable, signal, TemplateRef } from '@angular/core';

export interface SlidePanelConfig {
  title: string;
  /** Width class applied to the panel. Defaults to 'w-full sm:w-[480px]'. */
  width?: string;
  /** Optional subtitle shown below the title. */
  subtitle?: string;
}

export interface SlidePanelState {
  config: SlidePanelConfig;
  template: TemplateRef<unknown> | null;
  context?: unknown;
}

@Injectable({ providedIn: 'root' })
export class SlidePanelService {
  readonly state = signal<SlidePanelState | null>(null);

  open<T>(template: TemplateRef<T>, config: SlidePanelConfig, context?: T): void {
    this.state.set({ config, template: template as TemplateRef<unknown>, context });
  }

  close(): void {
    this.state.set(null);
  }
}
