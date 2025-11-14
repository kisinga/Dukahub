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
        <div class="flex justify-end mb-6">
            <div class="w-full md:w-80">
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{{ formatCurrency(subtotal()) }}</span>
                    </div>
                    @if (hasTax()) {
                        <div class="flex justify-between">
                            <span>Tax:</span>
                            <span>{{ formatCurrency(tax()) }}</span>
                        </div>
                    }
                    <div class="flex justify-between pt-2 border-t font-bold text-lg">
                        <span>Total:</span>
                        <span>{{ formatCurrency(total()) }}</span>
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

