import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ProductVariant } from '../../../../core/services/product/product-search.service';
import { StockAdjustmentLineItem } from '../../../../core/services/stock-adjustment.service.types';
import { StockLocation } from '../../../../core/services/stock-location.service';

/**
 * Extended line item with current stock and new stock for display
 */
export interface StockAdjustmentLineItemDisplay extends StockAdjustmentLineItem {
    currentStock?: number;
    newStock?: number;
    variant?: ProductVariant;
}

/**
 * Stock Adjustment Line Items Table Component
 * 
 * Displays line items with current stock, new stock (editable), 
 * computed difference, and location selector.
 */
@Component({
    selector: 'app-stock-adjustment-line-items-table',
    imports: [CommonModule],
    template: `
        @if (lineItems().length > 0) {
        <div class="card bg-base-100 shadow">
            <div class="card-body p-0">
                <div class="overflow-x-auto">
                    <!-- Desktop Table -->
                    <table class="table table-zebra table-sm hidden lg:table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th class="text-right">Current Stock</th>
                                <th class="text-right">New Stock</th>
                                <th class="text-right">Difference</th>
                                <th>Location</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            @for (line of lineItems(); track $index) {
                            <tr>
                                <td>
                                    <div class="font-medium">{{ getProductName(line) }}</div>
                                    <div class="text-xs opacity-60">SKU: {{ line.variant?.sku || line.variantId }}</div>
                                </td>
                                <td class="text-right">
                                    <div class="text-tabular font-medium">{{ getCurrentStock(line) }}</div>
                                </td>
                                <td class="text-right">
                                    <input
                                        type="number"
                                        class="input input-xs w-24 text-right text-tabular"
                                        step="0.01"
                                        min="0"
                                        [value]="getNewStock(line)"
                                        (change)="onNewStockUpdate($index, parseFloat($any($event.target).value) || 0)"
                                    />
                                </td>
                                <td class="text-right">
                                    <span 
                                        class="text-tabular font-semibold"
                                        [class.text-success]="getDifference(line) > 0"
                                        [class.text-error]="getDifference(line) < 0"
                                        [class.text-base-content]="getDifference(line) === 0"
                                    >
                                        {{ formatDifference(getDifference(line)) }}
                                    </span>
                                </td>
                                <td>
                                    @for (location of stockLocations(); track location.id) {
                                        @if (location.id === line.stockLocationId) {
                                        <div class="text-sm">{{ location.name }}</div>
                                        }
                                    }
                                </td>
                                <td>
                                    <button
                                        type="button"
                                        class="btn btn-xs btn-error"
                                        (click)="onLineItemRemove($index)"
                                        aria-label="Remove item"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                            }
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="2">Total Changes</th>
                                <th class="text-right text-tabular">{{ formatTotalChanges() }}</th>
                                <th colspan="3"></th>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- Mobile Cards -->
                    <div class="lg:hidden divide-y divide-base-200">
                        @for (line of lineItems(); track $index) {
                        <div class="p-4 space-y-3">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <div class="font-medium">{{ getProductName(line) }}</div>
                                    <div class="text-xs opacity-60">SKU: {{ line.variant?.sku || line.variantId }}</div>
                                </div>
                                <button
                                    type="button"
                                    class="btn btn-xs btn-error btn-circle"
                                    (click)="onLineItemRemove($index)"
                                    aria-label="Remove item"
                                >
                                    🗑️
                                </button>
                            </div>

                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <div class="text-xs opacity-60 mb-1">Current Stock</div>
                                    <div class="text-lg font-bold text-tabular">{{ getCurrentStock(line) }}</div>
                                </div>
                                <div>
                                    <div class="text-xs opacity-60 mb-1">Difference</div>
                                    <div 
                                        class="text-lg font-bold text-tabular"
                                        [class.text-success]="getDifference(line) > 0"
                                        [class.text-error]="getDifference(line) < 0"
                                        [class.text-base-content]="getDifference(line) === 0"
                                    >
                                        {{ formatDifference(getDifference(line)) }}
                                    </div>
                                </div>
                            </div>

                            <div class="form-control">
                                <label class="label py-1">
                                    <span class="label-text text-xs font-semibold">New Stock Quantity</span>
                                </label>
                                <input
                                    type="number"
                                    class="input input-bordered w-full text-tabular"
                                    step="0.01"
                                    min="0"
                                    [value]="getNewStock(line)"
                                    (change)="onNewStockUpdate($index, parseFloat($any($event.target).value) || 0)"
                                />
                            </div>

                            <div class="form-control">
                                <label class="label py-1">
                                    <span class="label-text text-xs font-semibold">Location</span>
                                </label>
                                @for (location of stockLocations(); track location.id) {
                                    @if (location.id === line.stockLocationId) {
                                    <div class="input input-bordered w-full bg-base-200 text-base-content">{{ location.name }}</div>
                                    }
                                }
                            </div>
                        </div>
                        }

                        <div class="p-4 bg-base-200">
                            <div class="flex justify-between items-center">
                                <span class="font-semibold">Total Changes:</span>
                                <span class="text-lg font-bold text-tabular">{{ formatTotalChanges() }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        } @else {
        <div class="card bg-base-100 shadow">
            <div class="card-body">
                <div class="text-center py-12 text-base-content/60">
                    <div class="text-5xl mb-3">📦</div>
                    <p class="font-semibold">No items added yet</p>
                    <p class="text-sm mt-2">Add items above to get started</p>
                </div>
            </div>
        </div>
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StockAdjustmentLineItemsTableComponent {
    readonly lineItems = input.required<StockAdjustmentLineItemDisplay[]>();
    readonly stockLocations = input.required<StockLocation[]>();

    readonly lineItemUpdate = output<{ index: number; field: keyof StockAdjustmentLineItem; value: any }>();
    readonly lineItemRemove = output<number>();

    // Computed total changes
    readonly totalChanges = computed(() => {
        return this.lineItems().reduce((sum, line) => {
            return sum + this.getDifference(line);
        }, 0);
    });

    getProductName(line: StockAdjustmentLineItemDisplay): string {
        return line.variant?.name || line.variantId || 'Unknown';
    }

    getCurrentStock(line: StockAdjustmentLineItemDisplay): number {
        // Try to get from line.currentStock first
        if (line.currentStock !== undefined && line.currentStock !== null) {
            return line.currentStock;
        }
        // Fallback to 0 if not available
        return 0;
    }

    getNewStock(line: StockAdjustmentLineItemDisplay): number {
        // Try to get from line.newStock first
        if (line.newStock !== undefined && line.newStock !== null) {
            return line.newStock;
        }
        // Fallback: calculate from current stock + quantity change
        const current = this.getCurrentStock(line);
        return current + (line.quantityChange || 0);
    }

    getDifference(line: StockAdjustmentLineItemDisplay): number {
        const current = this.getCurrentStock(line);
        const newStock = this.getNewStock(line);
        return newStock - current;
    }

    onNewStockUpdate(index: number, value: number): void {
        // Update newStock and compute quantityChange
        const line = this.lineItems()[index];
        const current = this.getCurrentStock(line);
        const quantityChange = value - current;
        
        // Emit update for quantityChange (which will trigger newStock calculation in parent)
        this.lineItemUpdate.emit({ index, field: 'quantityChange', value: quantityChange });
    }

    onLineItemRemove(index: number): void {
        this.lineItemRemove.emit(index);
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

    formatTotalChanges(): string {
        const total = this.totalChanges();
        return this.formatDifference(total);
    }

    parseFloat(value: string | number): number {
        return parseFloat(String(value)) || 0;
    }
}

