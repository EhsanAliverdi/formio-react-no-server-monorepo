import { computed, Injectable, signal, TemplateRef, Type } from '@angular/core';

export interface SlidePanelConfig {
  title: string;
  /** Width class applied to the panel. Defaults to 'w-full sm:w-[480px]'. */
  width?: string;
  /** Optional subtitle shown below the title. */
  subtitle?: string;
}

export interface SlidePanelState {
  id: number;
  config: SlidePanelConfig;
  template: TemplateRef<unknown> | null;
  component: Type<unknown> | null;
  componentInputs?: Record<string, unknown>;
  context?: unknown;
}

@Injectable({ providedIn: 'root' })
export class SlidePanelService {
  private readonly panelStack = signal<SlidePanelState[]>([]);
  readonly panels = this.panelStack.asReadonly();
  readonly state = computed(() => {
    const panels = this.panels();
    return panels.length > 0 ? panels[panels.length - 1] : null;
  });

  private nextId = 1;
  private previouslyFocusedElements = new Map<number, HTMLElement | null>();

  open<T>(template: TemplateRef<T>, config: SlidePanelConfig, context?: T): void {
    this.push({
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
    this.push({ config, template: null, component, componentInputs });
  }

  close(id?: number): void {
    const panels = this.panels();
    const top = panels[panels.length - 1];
    if (!top || (id !== undefined && top.id !== id)) return;

    this.panelStack.set(panels.slice(0, -1));

    const previouslyFocusedElement = this.previouslyFocusedElements.get(top.id);
    this.previouslyFocusedElements.delete(top.id);
    queueMicrotask(() => previouslyFocusedElement?.focus());
  }

  private push(state: Omit<SlidePanelState, 'id'>): void {
    const id = this.nextId++;
    const previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.previouslyFocusedElements.set(id, previouslyFocusedElement);
    this.panelStack.update(panels => [...panels, { id, ...state }]);
  }
}
