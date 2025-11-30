import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type StatCardColor =
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'neutral'
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

/**
 * Compact gradient stat card component
 *
 * A beautiful, space-efficient stat card with gradient background.
 * Used across all dashboard pages for consistent visual language.
 */
@Component({
    selector: 'app-stat-card',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <div
      class="card border transition-all duration-200 hover:shadow-md"
      [class]="getCardClasses()"
    >
      <div class="card-body p-3 lg:p-4">
        <div class="flex items-center gap-3">
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            [class]="getIconContainerClasses()"
          >
            <ng-content select="[icon]"></ng-content>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-xs text-base-content/60 truncate">{{ label() }}</p>
            <p class="text-xl lg:text-2xl font-bold tracking-tight" [class]="getValueClasses()">
              {{ value() }}
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class StatCardComponent {
    readonly label = input.required<string>();
    readonly value = input.required<string | number>();
    readonly color = input<StatCardColor>('primary');

    getCardClasses(): string {
        const c = this.color();
        return `bg-gradient-to-br from-${c}/10 to-${c}/5 border-${c}/20`;
    }

    getIconContainerClasses(): string {
        return `bg-${this.color()}/10`;
    }

    getValueClasses(): string {
        return `text-${this.color()}`;
    }
}

