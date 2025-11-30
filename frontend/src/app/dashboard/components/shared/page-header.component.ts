import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Dashboard page header component
 *
 * Provides a consistent header layout across all dashboard pages.
 * Bold title ensures users always know where they are.
 */
@Component({
  selector: 'app-page-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex items-start justify-between gap-4">
      <div class="flex-1 min-w-0">
        <h1 class="text-2xl lg:text-3xl font-bold tracking-tight">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="text-sm text-base-content/60 mt-1">{{ subtitle() }}</p>
        }
      </div>

      <div class="flex gap-2 shrink-0">
        <!-- Refresh button -->
        @if (showRefresh()) {
          <button
            (click)="refresh.emit()"
            class="btn btn-ghost btn-square btn-sm lg:btn-md"
            [class.loading]="isLoading()"
            [title]="refreshTitle()"
          >
            @if (!isLoading()) {
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            }
          </button>
        }

        <!-- Custom actions slot -->
        <ng-content select="[actions]"></ng-content>
      </div>
    </div>
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly showRefresh = input(true);
  readonly isLoading = input(false);
  readonly refreshTitle = input('Refresh');

  readonly refresh = output<void>();
}

