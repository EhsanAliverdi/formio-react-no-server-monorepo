import { Injectable, signal, TemplateRef, Type } from '@angular/core';

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
  component: Type<unknown> | null;
  componentInputs?: Record<string, unknown>;
  context?: unknown;
}

@Injectable({ providedIn: 'root' })
export class SlidePanelService {
  readonly state = signal<SlidePanelState | null>(null);
  private previouslyFocusedElement: HTMLElement | null = null;

  open<T>(template: TemplateRef<T>, config: SlidePanelConfig, context?: T): void {
    this.captureFocus();
    this.state.set({
      config,
      template: template as TemplateRef<unknown>,
      component: null,
      context,
    });
  }

  openComponent(
    component: Type<unknown>,
    config: SlidePanelConfig,
    componentInputs?: Record<string, unknown>,
  ): void {
    this.captureFocus();
    this.state.set({ config, template: null, component, componentInputs });
  }

  close(): void {
    this.state.set(null);
    this.previouslyFocusedElement?.focus();
    this.previouslyFocusedElement = null;
  }

  private captureFocus(): void {
    this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  }
}
