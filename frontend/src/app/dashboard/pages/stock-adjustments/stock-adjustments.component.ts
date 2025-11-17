import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProductSearchService, ProductVariant } from '../../../core/services/product/product-search.service';
import { StockAdjustmentService } from '../../../core/services/stock-adjustment.service';
import { StockAdjustmentLineItem } from '../../../core/services/stock-adjustment.service.types';
import { StockLocationService } from '../../../core/services/stock-location.service';
import { StockAdjustmentFormFieldsComponent } from './components/stock-adjustment-form-fields.component';
import { StockAdjustmentLineItemFormComponent } from './components/stock-adjustment-line-item-form.component';
import { StockAdjustmentLineItemDisplay, StockAdjustmentLineItemsTableComponent } from './components/stock-adjustment-line-items-table.component';

@Component({
    selector: 'app-stock-adjustments',
    imports: [
        CommonModule,
        StockAdjustmentFormFieldsComponent,
        StockAdjustmentLineItemFormComponent,
        StockAdjustmentLineItemsTableComponent,
    ],
    templateUrl: './stock-adjustments.component.html',
    styleUrl: './stock-adjustments.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjustmentsComponent implements OnInit {
    private readonly router = inject(Router);
    readonly stockAdjustmentService = inject(StockAdjustmentService);
    readonly productSearchService = inject(ProductSearchService);
    readonly stockLocationService = inject(StockLocationService);

    // Service signals
    readonly adjustmentDraft = this.stockAdjustmentService.adjustmentDraft;
    readonly isLoading = this.stockAdjustmentService.isLoading;
    readonly error = this.stockAdjustmentService.error;
    readonly hasPermission = this.stockAdjustmentService.hasPermission;
    readonly stockLocations = this.stockLocationService.locations;

    // Local UI state
    readonly productSearchTerm = signal<string>('');
    readonly productSearchResults = signal<ProductVariant[]>([]);
    readonly showSuccessMessage = signal<boolean>(false);

    // New line item form (with currentStock and newStock for display)
    readonly newLineItem = signal<{
        variantId?: string;
        variant?: ProductVariant;
        stockLocationId?: string;
        newStock?: number;
        currentStock?: number;
    }>({});

    // Display line items with currentStock and newStock
    readonly displayLineItems = computed<StockAdjustmentLineItemDisplay[]>(() => {
        const draft = this.adjustmentDraft();
        if (!draft?.lines) {
            return [];
        }

        return draft.lines.map((line, index) => {
            // For existing items, try to preserve currentStock and newStock from previous state
            // In a real app, we'd fetch this from the backend or store it in the draft
            const currentStock = (line as any).currentStock ?? null;
            const newStock = currentStock !== null && line.quantityChange !== undefined
                ? currentStock + line.quantityChange
                : undefined;

            return {
                ...line,
                currentStock,
                newStock,
                variant: (line as any).variant,
            };
        });
    });

    ngOnInit(): void {
        if (this.hasPermission()) {
            this.stockAdjustmentService.initializeDraft();
            this.stockLocationService.fetchStockLocations();
        }
    }

    /**
     * Product search for line items
     */
    async handleProductSearch(term: string): Promise<void> {
        this.productSearchTerm.set(term);
        const trimmed = term.trim();

        if (trimmed.length < 2) {
            this.productSearchResults.set([]);
            return;
        }

        try {
            const results = await this.productSearchService.searchProducts(trimmed);
            const variants = results.flatMap((r: any) => r.variants || []);
            this.productSearchResults.set(variants);
        } catch (error) {
            console.error('Product search failed:', error);
            this.productSearchResults.set([]);
        }
    }

    async handleProductSelect(variant: ProductVariant): Promise<void> {
        const defaultLocation = this.stockLocations()[0];
        const locationId = defaultLocation?.id || '';

        // Fetch current stock for the selected variant at default location
        let currentStock: number | null = null;
        if (locationId && variant.id) {
            currentStock = await this.stockAdjustmentService.getStockLevelForLocation(variant.id, locationId);
        }

        this.newLineItem.set({
            variantId: variant.id,
            variant: variant,
            stockLocationId: locationId,
            currentStock: currentStock ?? undefined,
            newStock: currentStock ?? undefined,
        });
        this.productSearchTerm.set('');
        this.productSearchResults.set([]);
    }

    async handleLocationChange(locationId: string): Promise<void> {
        const current = this.newLineItem();
        if (!current.variantId || !locationId) {
            return;
        }

        // Fetch current stock for the variant at the new location
        const currentStock = await this.stockAdjustmentService.getStockLevelForLocation(current.variantId, locationId);

        // Preserve the user-entered newStock value if they've already entered one
        // Only reset newStock to currentStock if it hasn't been explicitly set by the user
        const preserveNewStock = current.newStock !== undefined &&
            current.newStock !== null &&
            current.currentStock !== undefined &&
            current.newStock !== current.currentStock;

        this.newLineItem.set({
            ...current,
            stockLocationId: locationId,
            currentStock: currentStock ?? undefined,
            // Only update newStock if user hasn't entered a custom value
            newStock: preserveNewStock ? current.newStock : (currentStock ?? undefined),
        });
    }

    handleNewStockChange(newStock: number): void {
        const current = this.newLineItem();
        this.newLineItem.set({
            ...current,
            newStock,
        });
    }

    /**
     * Add line item to draft
     * Converts newStock to quantityChange for backend
     */
    handleAddLineItem(): void {
        const item = this.newLineItem();
        if (!item.variantId || !item.stockLocationId || item.newStock === undefined || item.currentStock === undefined) {
            return;
        }

        // Calculate quantityChange from newStock - currentStock
        const quantityChange = item.newStock - item.currentStock;

        try {
            const lineItem: StockAdjustmentLineItem & { currentStock?: number; newStock?: number; variant?: ProductVariant } = {
                variantId: item.variantId,
                variant: item.variant,
                quantityChange,
                stockLocationId: item.stockLocationId,
                currentStock: item.currentStock,
                newStock: item.newStock,
            };

            this.stockAdjustmentService.addAdjustmentItemLocal(lineItem as any);
            this.newLineItem.set({});
        } catch (error: any) {
            console.error('Failed to add item:', error);
        }
    }

    /**
     * Remove line item
     */
    handleRemoveLineItem(index: number): void {
        this.stockAdjustmentService.removeAdjustmentItemLocal(index);
    }

    /**
     * Update line item
     * Handles both newStock (input) and quantityChange (stored)
     */
    async handleUpdateLineItem(index: number, field: keyof StockAdjustmentLineItem, value: any): Promise<void> {
        const draft = this.adjustmentDraft();
        if (!draft?.lines[index]) {
            return;
        }

        const line = draft.lines[index] as any;

        // If updating stockLocationId, fetch new current stock
        if (field === 'stockLocationId' && line.variantId && value) {
            const currentStock = await this.stockAdjustmentService.getStockLevelForLocation(line.variantId, value);

            // Update current stock and recalculate new stock
            const oldCurrentStock = line.currentStock ?? 0;
            const oldNewStock = line.newStock ?? (oldCurrentStock + (line.quantityChange || 0));
            const newNewStock = oldCurrentStock !== null ? oldNewStock - oldCurrentStock + (currentStock ?? 0) : oldNewStock;

            const newQuantityChange = currentStock !== null ? newNewStock - currentStock : line.quantityChange;

            this.stockAdjustmentService.updateAdjustmentItemLocal(index, {
                stockLocationId: value,
                quantityChange: newQuantityChange,
                currentStock: currentStock ?? undefined,
                newStock: newNewStock,
            } as any);
            return;
        }

        // If updating quantityChange, also update newStock
        if (field === 'quantityChange') {
            // If currentStock is not available, fetch it
            let currentStock = line.currentStock;
            if (currentStock === undefined || currentStock === null) {
                if (line.variantId && line.stockLocationId) {
                    currentStock = await this.stockAdjustmentService.getStockLevelForLocation(line.variantId, line.stockLocationId) ?? 0;
                } else {
                    currentStock = 0;
                }
            }

            const newStock = currentStock + value;

            this.stockAdjustmentService.updateAdjustmentItemLocal(index, {
                quantityChange: value,
                currentStock: currentStock ?? undefined,
                newStock,
            } as any);
            return;
        }

        // Default update
        this.stockAdjustmentService.updateAdjustmentItemLocal(index, { [field]: value });
    }

    /**
     * Submit adjustment
     */
    async handleSubmitAdjustment(): Promise<void> {
        try {
            await this.stockAdjustmentService.submitStockAdjustment();
            this.showSuccessMessage.set(true);
            setTimeout(() => {
                this.showSuccessMessage.set(false);
                this.stockAdjustmentService.createNewDraft();
                this.newLineItem.set({});
            }, 3000);
        } catch (error: any) {
            console.error('Adjustment submission failed:', error);
        }
    }

    /**
     * Handle reason change
     */
    handleReasonChange(value: string): void {
        this.stockAdjustmentService.updateDraftField('reason', value);
    }

    /**
     * Handle notes change
     */
    handleNotesChange(value: string): void {
        this.stockAdjustmentService.updateDraftField('notes', value);
    }

    /**
     * Go back
     */
    goBack(): void {
        this.router.navigate(['/dashboard']);
    }

    /**
     * Clear error
     */
    clearError(): void {
        this.stockAdjustmentService.clearError();
    }
}

