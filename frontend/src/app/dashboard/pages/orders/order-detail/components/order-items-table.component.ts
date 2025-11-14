import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CurrencyService } from '../../../../../core/services/currency.service';
import type { OrderItemsTableInput } from '../order-detail.types';

/**
 * Order Items Table Component
 * 
 * Displays order items in a table format with currency formatting
 */
@Component({
    selector: 'app-order-items-table',
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="mb-6">
            <h3 class="font-semibold mb-4">Items</h3>
            <div class="overflow-x-auto">
                <table class="table table-zebra">
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th class="text-right">Quantity</th>
                            <th class="text-right">Unit Price</th>
                            <th class="text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        @for (line of lines(); track line.id) {
                            <tr>
                                <td>
                                    <div class="font-medium">{{ line.productVariant.name }}</div>
                                    <div class="text-sm text-base-content/60">SKU: {{ line.productVariant.sku }}</div>
                                </td>
                                <td class="text-right">{{ line.quantity }}</td>
                                <td class="text-right">
                                    {{ formatCurrency(line.linePriceWithTax / line.quantity) }}
                                </td>
                                <td class="text-right font-medium">
                                    {{ formatCurrency(line.linePriceWithTax) }}
                                </td>
                            </tr>
                        }
                    </tbody>
                </table>
            </div>
        </div>
    `,
})
export class OrderItemsTableComponent {
    private readonly currencyService = inject(CurrencyService);
    readonly lines = input.required<OrderItemsTableInput['lines']>();

    formatCurrency(amount: number): string {
        return this.currencyService.format(amount, false);
    }
}

