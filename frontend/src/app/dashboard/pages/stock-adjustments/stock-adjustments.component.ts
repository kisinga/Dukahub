import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ProductSearchService, ProductVariant } from '../../../core/services/product/product-search.service';
import { StockAdjustmentService } from '../../../core/services/stock-adjustment.service';
import { StockAdjustmentLineItem } from '../../../core/services/stock-adjustment.service.types';
import { StockLocationService } from '../../../core/services/stock-location.service';

const ADJUSTMENT_REASONS = [
    { value: 'damage', label: 'Damage' },
    { value: 'loss', label: 'Loss/Theft' },
    { value: 'found', label: 'Found' },
    { value: 'correction', label: 'Correction' },
    { value: 'expired', label: 'Expired' },
    { value: 'return', label: 'Return from Customer' },
    { value: 'other', label: 'Other' },
] as const;

@Component({
    selector: 'app-stock-adjustments',
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './stock-adjustments.component.html',
    styleUrl: './stock-adjustments.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockAdjustmentsComponent implements OnInit {
    protected readonly stockAdjustmentService: StockAdjustmentService = inject(StockAdjustmentService);
    protected readonly authService: AuthService = inject(AuthService);
    protected readonly productSearchService: ProductSearchService = inject(ProductSearchService);
    protected readonly stockLocationService: StockLocationService = inject(StockLocationService);

    // Expose service for template
    readonly stockAdjustmentServiceRef = this.stockAdjustmentService;

    // Service signals
    readonly adjustmentDraft = this.stockAdjustmentService.adjustmentDraft;
    readonly isLoading = this.stockAdjustmentService.isLoading;
    readonly error = this.stockAdjustmentService.error;
    readonly lineCount = this.stockAdjustmentService.lineCount;
    readonly hasPermission = this.stockAdjustmentService.hasPermission;
    readonly stockLocations = this.stockLocationService.locations;

    // Constants
    readonly adjustmentReasons = ADJUSTMENT_REASONS;

    // Local UI state
    readonly productSearchTerm = signal<string>('');
    readonly productSearchResults = signal<ProductVariant[]>([]);
    readonly isSearchingProducts = signal<boolean>(false);
    readonly showSuccessMessage = signal<boolean>(false);

    // New line item form
    readonly newLineItem = signal<Partial<StockAdjustmentLineItem>>({
        variantId: '',
        quantityChange: 0,
        stockLocationId: '',
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

        this.isSearchingProducts.set(true);
        try {
            const results = await this.productSearchService.searchProducts(trimmed);
            const variants = results.flatMap((r: any) => r.variants || []);
            this.productSearchResults.set(variants);
        } catch (error) {
            console.error('Product search failed:', error);
            this.productSearchResults.set([]);
        } finally {
            this.isSearchingProducts.set(false);
        }
    }

    handleProductSelect(variant: ProductVariant): void {
        const defaultLocation = this.stockLocations()[0];
        this.newLineItem.set({
            variantId: variant.id,
            variant: variant,
            quantityChange: 0,
            stockLocationId: defaultLocation?.id || '',
        });
        this.productSearchTerm.set('');
        this.productSearchResults.set([]);
    }

    /**
     * Add line item to draft
     */
    handleAddLineItem(): void {
        const item = this.newLineItem();
        if (!item.variantId || !item.stockLocationId || item.quantityChange === 0) {
            return;
        }

        try {
            this.stockAdjustmentService.addAdjustmentItemLocal(item as StockAdjustmentLineItem);
            this.newLineItem.set({
                variantId: '',
                quantityChange: 0,
                stockLocationId: '',
            });
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
     */
    handleUpdateLineItem(index: number, field: keyof StockAdjustmentLineItem, value: any): void {
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
            }, 3000);
        } catch (error: any) {
            console.error('Adjustment submission failed:', error);
        }
    }

    /**
     * Format quantity change (show +/-)
     */
    formatQuantityChange(change: number): string {
        if (change > 0) {
            return `+${change}`;
        }
        return String(change);
    }

    /**
     * Update new line item field
     */
    updateNewLineItem(field: keyof StockAdjustmentLineItem, value: any): void {
        const current = this.newLineItem();
        this.newLineItem.set({
            ...current,
            [field]: value,
        });
    }

    /**
     * Parse float helper
     */
    parseFloat(value: string | number): number {
        return parseFloat(String(value)) || 0;
    }
}

