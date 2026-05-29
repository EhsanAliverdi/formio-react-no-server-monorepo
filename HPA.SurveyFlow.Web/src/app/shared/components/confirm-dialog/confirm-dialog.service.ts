import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info';
}

interface DialogState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  state = signal<DialogState | null>(null);

  open(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => {
      this.state.set({ ...options, resolve });
    });
  }

  confirm(): void {
    this.state()?.resolve(true);
    this.state.set(null);
  }

  cancel(): void {
    this.state()?.resolve(false);
    this.state.set(null);
  }
}
