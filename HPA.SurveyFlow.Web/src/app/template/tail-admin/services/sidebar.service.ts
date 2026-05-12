import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  isExpanded = signal<boolean>(true);
  isMobileOpen = signal<boolean>(false);
  isHovered = signal<boolean>(false);

  toggleSidebar(): void {
    this.isExpanded.update(v => !v);
  }

  toggleMobileSidebar(): void {
    this.isMobileOpen.update(v => !v);
  }

  setHovered(hovered: boolean): void {
    this.isHovered.set(hovered);
  }
}
