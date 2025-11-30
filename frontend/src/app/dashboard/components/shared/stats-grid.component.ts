import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Stats grid component
 *
 * Responsive grid wrapper for stat cards.
 * Adapts from 2 columns on mobile to 4-5 columns on desktop.
 */
@Component({
  selector: 'app-stats-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="getGridClasses()">
      <ng-content></ng-content>
    </div>
  `,
})
export class StatsGridComponent {
  /**
   * Number of columns on large screens (default: 4)
   * Options: 2, 3, 4, 5
   */
  readonly columns = input<2 | 3 | 4 | 5>(4);

  getGridClasses(): string {
    const cols = this.columns();
    const lgCols = cols === 5 ? 'lg:grid-cols-5' : cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';
    return `grid grid-cols-2 ${lgCols} gap-3 lg:gap-4`;
  }
}

