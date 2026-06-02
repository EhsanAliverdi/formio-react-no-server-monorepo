import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GridStack, GridStackNode } from 'gridstack';
import { Dashboard, DashboardCard } from '../../../core/models';
import { DashboardCardComponent } from '../dashboard-card/dashboard-card.component';

@Component({
  selector: 'app-dashboard-grid',
  standalone: true,
  imports: [CommonModule, DashboardCardComponent],
  template: `
    <div #grid class="grid-stack">
      @for (card of dashboard.cards; track card.id) {
        <div
          class="grid-stack-item"
          [attr.gs-id]="card.id"
          [attr.gs-x]="card.x"
          [attr.gs-y]="card.y"
          [attr.gs-w]="card.w"
          [attr.gs-h]="card.h"
          [attr.gs-min-w]="card.min_w"
          [attr.gs-min-h]="card.min_h"
          [attr.gs-max-w]="card.max_w"
          [attr.gs-max-h]="card.max_h"
        >
          <div class="grid-stack-item-content">
            <app-dashboard-card
              [card]="card"
              [mode]="mode"
              [dashboardSlug]="dashboard.slug"
              (remove)="remove.emit($event)"
              (settings)="settings.emit($event)"
            />
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardGridComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) dashboard!: Dashboard;
  @Input() mode: 'designer' | 'viewer' = 'viewer';
  @Output() layoutChanged = new EventEmitter<DashboardCard[]>();
  @Output() remove = new EventEmitter<DashboardCard>();
  @Output() settings = new EventEmitter<DashboardCard>();
  @ViewChild('grid', { static: true }) gridElement!: ElementRef<HTMLElement>;

  private grid?: GridStack;

  ngAfterViewInit(): void {
    this.initialise();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.grid || !changes['dashboard']) return;
    setTimeout(() => this.reload(), 0);
  }

  ngOnDestroy(): void {
    this.grid?.destroy(false);
  }

  private initialise(): void {
    this.grid = GridStack.init({
      column: 12,
      cellHeight: 84,
      margin: 8,
      float: false,
      disableDrag: this.mode === 'viewer',
      disableResize: this.mode === 'viewer',
    }, this.gridElement.nativeElement);
    this.grid.on('change', (_event, nodes) => this.emitLayout(nodes));
  }

  private reload(): void {
    this.grid?.destroy(false);
    this.grid = undefined;
    this.initialise();
  }

  private emitLayout(nodes: GridStackNode[]): void {
    const positions = new Map(nodes.map(node => [Number(node.id), node]));
    const cards = this.dashboard.cards.map(card => {
      const node = positions.get(card.id);
      return node ? { ...card, x: node.x ?? card.x, y: node.y ?? card.y, w: node.w ?? card.w, h: node.h ?? card.h } : card;
    });
    this.layoutChanged.emit(cards);
  }
}
