import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ProductVariant } from '../../../../core/services/product/product-search.service';
import { StockLocation } from '../../../../core/services/stock-location.service';

/**
 * Stock Adjustment Line Item Form Component
 * 
 * Handles adding new line items with product search, stock level display,
 * and new stock quantity input (not quantity change).
 */
@Component({
    selector: 'app-stock-adjustment-line-item-form',
    imports: [CommonModule],
    template: `
        <div class="card bg-base-200 shadow">
            <div class="card-body p-4 space-y-3">
                <h3 class="font-semibold text-base">📦 Add Item</h3>

                <!-- Product Search -->
                <div class="form-control">
                    <input
                        type="text"
                        class="input input-bordered w-full"
                        placeholder="Search product by name or SKU..."
                        [value]="productSearchTerm()"
                        (input)="onProductSearch($any($event.target).value)"
                    />
                    @if (productSearchResults().length > 0) {
                    <div class="relative">
                        <div class="absolute z-10 w-full mt-1 bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            @for (variant of productSearchResults(); track variant.id) {
                            <button
                                type="button"
                                class="w-full text-left px-4 py-3 hover:bg-base-200 border-b border-base-200 last:border-b-0"
                                (click)="onProductSelect(variant)"
                            >
                                <div class="font-medium">{{ variant.productName || variant.name || variant.sku }}</div>
                                @if (variant.name && variant.name !== variant.productName) {
                                <div class="text-sm opacity-70">{{ variant.name }}</div>
                                }
                                <div class="text-xs opacity-60">SKU: {{ variant.sku }}</div>
                            </button>
                            }
                        </div>
                    </div>
                    }
                </div>

                @if (lineItem().variantId) {
                <div class="grid grid-cols-1 gap-3">
                    <!-- Current Stock Display -->
                    @if (currentStock() !== null) {
                    <div class="alert bg-base-100">
                        <div class="flex-1">
                            <div class="text-sm font-semibold">Current Stock</div>
                            <div class="text-2xl font-bold text-tabular">{{ currentStock() }}</div>
                        </div>
                    </div>
                    }

                    <!-- New Stock Quantity and Location -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div class="form-control">
                            <label class="label">
                                <span class="label-text font-semibold">New Stock Quantity *</span>
                            </label>
                            <input
                                type="number"
                                class="input input-bordered w-full"
                                placeholder="Enter counted quantity"
                                step="0.01"
                                min="0"
                                [value]="lineItem().newStock ?? ''"
                                (input)="onNewStockChange(parseFloat($any($event.target).value) || 0)"
                            />
                            @if (currentStock() !== null && lineItem().newStock !== undefined && lineItem().newStock !== null) {
                            <div class="label">
                                <span 
                                    class="label-text-alt"
                                    [class.text-success]="difference() > 0"
                                    [class.text-error]="difference() < 0"
                                    [class.text-base-content]="difference() === 0"
                                >
                                    Difference: {{ formatDifference(difference()) }}
                                </span>
                            </div>
                            }
                        </div>

                        @if (lineItem().stockLocationId) {
                        <div class="card bg-base-200">
                            <div class="card-body p-3">
                                <h3 class="font-bold text-sm">Location</h3>
                                <p class="text-xs opacity-60">
                                    Stock will be adjusted at:
                                    <strong>{{ getLocationName(lineItem().stockLocationId!) }}</strong>
                                </p>
                            </div>
                        </div>
                        }
                    </div>

                    <!-- Add Button -->
                    <button
                        type="button"
                        class="btn btn-primary"
                        [disabled]="!canAddItem()"
                        (click)="onAddItem()"
                    >
                        ➕ Add Item
                    </button>
                </div>
                }
            </div>
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockAdjustmentLineItemFormComponent {
    readonly stockLocations = input.required<StockLocation[]>();
    readonly productSearchTerm = input<string>('');
    readonly productSearchResults = input<ProductVariant[]>([]);
    readonly lineItem = input.required<{
        variantId?: string;
        variant?: ProductVariant;
        stockLocationId?: string;
        newStock?: number;
        currentStock?: number;
    }>();

    readonly productSearch = output<string>();
    readonly productSelect = output<ProductVariant>();
    readonly newStockChange = output<number>();
    readonly addItem = output<void>();

    // Current stock level for selected variant/location
    readonly currentStock = computed(() => {
        const item = this.lineItem();
        return item.currentStock ?? null;
    });

    // Computed difference
    readonly difference = computed(() => {
        const item = this.lineItem();
        const current = item.currentStock ?? null;
        const newStock = item.newStock;
        
        if (current === null || newStock === undefined || newStock === null) {
            return 0;
        }
        
        return newStock - current;
    });

    onProductSearch(term: string): void {
        this.productSearch.emit(term);
    }

    onProductSelect(variant: ProductVariant): void {
        this.productSelect.emit(variant);
    }

    onNewStockChange(value: number): void {
        this.newStockChange.emit(value);
    }

    onAddItem(): void {
        this.addItem.emit();
    }

    canAddItem(): boolean {
        const item = this.lineItem();
        return !!(
            item.variantId &&
            item.stockLocationId &&
            item.newStock !== undefined &&
            item.newStock !== null &&
            item.newStock >= 0
        );
    }

    formatDifference(diff: number): string {
        if (diff > 0) {
            return `+${diff}`;
        } else if (diff < 0) {
            return String(diff);
        } else {
            return '0';
        }
    }

    parseFloat(value: string | number): number {
        return parseFloat(String(value)) || 0;
    }

    getLocationName(locationId: string): string {
        const location = this.stockLocations().find(loc => loc.id === locationId);
        return location?.name || 'Unknown location';
    }
}

