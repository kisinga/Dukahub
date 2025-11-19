import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CurrencyService } from '../../../../../core/services/currency.service';
import type { OrderTotalsInput } from '../order-detail.types';

/**
 * Order Totals Component
 *
 * Displays subtotal, tax, and total with currency formatting
 */
@Component({
  selector: 'app-order-totals',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex justify-end">
      <div class="w-full sm:w-80">
        <div class="space-y-2.5">
          <div class="flex justify-between text-sm sm:text-base">
            <span class="text-base-content/70">Subtotal:</span>
            <span class="font-medium">{{ formatCurrency(subtotal()) }}</span>
          </div>
          @if (hasTax()) {
            <div class="flex justify-between text-sm sm:text-base">
              <span class="text-base-content/70">Tax:</span>
              <span class="font-medium">{{ formatCurrency(tax()) }}</span>
            </div>
          }
          <div
            class="flex justify-between pt-3 border-t border-base-300/50 font-bold text-lg sm:text-xl"
          >
            <span class="text-base-content">Total:</span>
            <span class="text-primary">{{ formatCurrency(total()) }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class OrderTotalsComponent {
  private readonly currencyService = inject(CurrencyService);
  readonly subtotal = input.required<number>();
  readonly tax = input.required<number>();
  readonly total = input.required<number>();

  readonly hasTax = computed(() => {
    return this.tax() > 0;
  });

  formatCurrency(amount: number): string {
    return this.currencyService.format(amount, false);
  }
}
