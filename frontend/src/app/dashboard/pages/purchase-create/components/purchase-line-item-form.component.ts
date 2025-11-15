import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ProductVariant } from '../../../../core/services/product/product-search.service';
import { StockLocation } from '../../../../core/services/stock-location.service';
import { PurchaseLineItem } from '../../../../core/services/purchase.service.types';

/**
 * Purchase Line Item Form Component
 * 
 * Reusable component for adding new line items to a purchase.
 * Handles product search, quantity, unit cost, and location selection.
 */
@Component({
    selector: 'app-purchase-line-item-form',
    imports: [CommonModule],
    template: `
        <div class="card bg-base-200 p-4 space-y-3">
            <div class="grid grid-cols-1 gap-3">
                <!-- Product Search -->
                <div>
                    <input
                        type="text"
                        class="input input-bordered w-full"
                        placeholder="Search product..."
                        [value]="productSearchTerm()"
                        (input)="onProductSearch($any($event.target).value)"
                    />
                    @if (productSearchResults().length > 0) {
                        <div class="relative">
                            <div class="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                @for (variant of productSearchResults(); track variant.id) {
                                    <button
                                        type="button"
                                        class="w-full text-left px-4 py-2 hover:bg-base-200"
                                        (click)="onProductSelect(variant)"
                                    >
                                        <div class="font-medium">{{ variant.name || variant.sku }}</div>
                                        <div class="text-sm opacity-60">SKU: {{ variant.sku }}</div>
                                    </button>
                                }
                            </div>
                        </div>
                    }
                </div>

                <!-- Quantity, Unit Cost, Location -->
                <div class="grid grid-cols-3 gap-2">
                    <div>
                        <input
                            type="number"
                            class="input input-bordered w-full"
                            placeholder="Qty"
                            step="0.01"
                            min="0.01"
                            [value]="lineItem().quantity || ''"
                            (input)="onLineItemFieldChange('quantity', parseFloat($any($event.target).value) || 0)"
                        />
                    </div>
                    <div>
                        <input
                            type="number"
                            class="input input-bordered w-full"
                            placeholder="Unit Cost"
                            step="0.01"
                            min="0"
                            [value]="lineItem().unitCost || ''"
                            (input)="onLineItemFieldChange('unitCost', parseFloat($any($event.target).value) || 0)"
                        />
                    </div>
                    <div>
                        <select
                            class="select select-bordered w-full"
                            [value]="lineItem().stockLocationId || ''"
                            (change)="onLineItemFieldChange('stockLocationId', $any($event.target).value)"
                        >
                            <option value="">Location...</option>
                            @for (location of stockLocations(); track location.id) {
                                <option [value]="location.id">{{ location.name }}</option>
                            }
                        </select>
                    </div>
                </div>
            </div>
            <button
                type="button"
                class="btn btn-primary btn-sm"
                [disabled]="!canAddItem()"
                (click)="onAddItem()"
            >
                ➕ Add Item
            </button>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class PurchaseLineItemFormComponent {
    readonly stockLocations = input.required<StockLocation[]>();
    readonly productSearchTerm = input<string>('');
    readonly productSearchResults = input<ProductVariant[]>([]);
    readonly lineItem = input.required<Partial<PurchaseLineItem>>();

    readonly productSearch = output<string>();
    readonly productSelect = output<ProductVariant>();
    readonly lineItemFieldChange = output<{ field: keyof PurchaseLineItem; value: any }>();
    readonly addItem = output<void>();

    // Local state for product search term
    private readonly localSearchTerm = signal<string>('');

    onProductSearch(term: string): void {
        this.localSearchTerm.set(term);
        this.productSearch.emit(term);
    }

    onProductSelect(variant: ProductVariant): void {
        this.productSelect.emit(variant);
    }

    onLineItemFieldChange(field: keyof PurchaseLineItem, value: any): void {
        this.lineItemFieldChange.emit({ field, value });
    }

    onAddItem(): void {
        this.addItem.emit();
    }

    canAddItem(): boolean {
        const item = this.lineItem();
        return !!(item.variantId && item.stockLocationId && item.quantity && item.unitCost);
    }

    parseFloat(value: string | number): number {
        return parseFloat(String(value)) || 0;
    }
}

