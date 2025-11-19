import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface OrderStats {
  totalOrders: number;
  draftOrders: number;
  unpaidOrders: number;
  paidOrders: number;
  todayOrders: number;
}

/**
 * Order Statistics Component
 *
 * Displays order statistics in cards
 */
@Component({
  selector: 'app-order-stats',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
      <div class="stat bg-base-100 shadow-sm rounded-lg py-3 sm:py-4 px-3 sm:px-4">
        <div class="stat-title text-xs sm:text-sm">Total Orders</div>
        <div class="stat-value text-lg sm:text-2xl lg:text-3xl text-primary">
          {{ stats().totalOrders }}
        </div>
      </div>
      <div class="stat bg-base-100 shadow-sm rounded-lg py-3 sm:py-4 px-3 sm:px-4">
        <div class="stat-title text-xs sm:text-sm">Draft</div>
        <div class="stat-value text-lg sm:text-2xl lg:text-3xl text-neutral">
          {{ stats().draftOrders }}
        </div>
      </div>
      <div class="stat bg-base-100 shadow-sm rounded-lg py-3 sm:py-4 px-3 sm:px-4">
        <div class="stat-title text-xs sm:text-sm">Unpaid</div>
        <div class="stat-value text-lg sm:text-2xl lg:text-3xl text-warning">
          {{ stats().unpaidOrders }}
        </div>
      </div>
      <div class="stat bg-base-100 shadow-sm rounded-lg py-3 sm:py-4 px-3 sm:px-4">
        <div class="stat-title text-xs sm:text-sm">Paid</div>
        <div class="stat-value text-lg sm:text-2xl lg:text-3xl text-success">
          {{ stats().paidOrders }}
        </div>
      </div>
      <div
        class="stat bg-base-100 shadow-sm rounded-lg py-3 sm:py-4 px-3 sm:px-4 col-span-2 sm:col-span-1"
      >
        <div class="stat-title text-xs sm:text-sm">Today</div>
        <div class="stat-value text-lg sm:text-2xl lg:text-3xl text-info">
          {{ stats().todayOrders }}
        </div>
      </div>
    </div>
  `,
})
export class OrderStatsComponent {
  readonly stats = input.required<OrderStats>();
}
