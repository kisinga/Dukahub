import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Mobile floating action button component
 *
 * Fixed position FAB for primary actions on mobile.
 * Hidden on desktop where inline buttons are used.
 */
@Component({
  selector: 'app-mobile-fab',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed bottom-24 right-4 z-40 lg:hidden">
      @if (routerLink()) {
        <a
          [routerLink]="routerLink()"
          class="btn btn-lg btn-circle btn-primary shadow-xl"
          [attr.aria-label]="ariaLabel()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </a>
      } @else {
        <button
          (click)="fabClick.emit()"
          class="btn btn-lg btn-circle btn-primary shadow-xl"
          [attr.aria-label]="ariaLabel()"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </button>
      }
    </div>
  `,
})
export class MobileFabComponent {
  readonly routerLink = input<string | string[]>();
  readonly ariaLabel = input('Create new');

  readonly fabClick = output<void>();
}

