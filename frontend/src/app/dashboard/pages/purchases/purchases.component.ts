import { CommonModule, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CustomerService } from '../../../core/services/customer.service';
import { ProductSearchService, ProductVariant } from '../../../core/services/product-search.service';
import { PurchaseService } from '../../../core/services/purchase.service';
import { PurchaseLineItem } from '../../../core/services/purchase.service.types';
import { StockLocationService } from '../../../core/services/stock-location.service';

interface Supplier {
    id: string;
    name: string;
    phoneNumber?: string;
}

@Component({
    selector: 'app-purchases',
    imports: [CommonModule, FormsModule, ReactiveFormsModule, DatePipe],
    templateUrl: './purchases.component.html',
    styleUrl: './purchases.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchasesComponent implements OnInit {
    protected readonly purchaseService: PurchaseService = inject(PurchaseService);
    protected readonly customerService: CustomerService = inject(CustomerService);
    protected readonly productSearchService: ProductSearchService = inject(ProductSearchService);
    protected readonly stockLocationService: StockLocationService = inject(StockLocationService);

    // Expose service for template
    readonly purchaseServiceRef = this.purchaseService;

    // Service signals
    readonly purchaseDraft = this.purchaseService.purchaseDraft;
    readonly isLoading = this.purchaseService.isLoading;
    readonly error = this.purchaseService.error;
    readonly totalCost = this.purchaseService.totalCost;
    readonly lineCount = this.purchaseService.lineCount;
    readonly stockLocations = this.stockLocationService.locations;

    // Local UI state
    readonly supplierSearchTerm = signal<string>('');
    readonly supplierSearchResults = signal<Supplier[]>([]);
    readonly isSearchingSuppliers = signal<boolean>(false);
    readonly productSearchTerm = signal<string>('');
    readonly productSearchResults = signal<ProductVariant[]>([]);
    readonly isSearchingProducts = signal<boolean>(false);
    readonly showSuccessMessage = signal<boolean>(false);

    // New line item form
    readonly newLineItem = signal<Partial<PurchaseLineItem>>({
        variantId: '',
        quantity: 1,
        unitCost: 0,
        stockLocationId: '',
    });

    ngOnInit(): void {
        this.purchaseService.initializeDraft();
        this.stockLocationService.fetchStockLocations();
    }

    /**
     * Supplier search
     */
    async handleSupplierSearch(term: string): Promise<void> {
        this.supplierSearchTerm.set(term);
        const trimmed = term.trim();

        if (trimmed.length < 2) {
            this.supplierSearchResults.set([]);
            return;
        }

        this.isSearchingSuppliers.set(true);
        try {
            // Search for suppliers (customers with isSupplier=true)
            const customers = await this.customerService.searchCustomers(trimmed);
            const suppliers = customers
                .filter((c: any) => (c.customFields as any)?.isSupplier === true)
                .map((c: any) => ({
                    id: c.id,
                    name: `${c.firstName} ${c.lastName}`.trim() || c.emailAddress || 'Unknown',
                    phoneNumber: c.phoneNumber,
                }));
            this.supplierSearchResults.set(suppliers);
        } catch (error) {
            console.error('Supplier search failed:', error);
            this.supplierSearchResults.set([]);
        } finally {
            this.isSearchingSuppliers.set(false);
        }
    }

    handleSupplierSelect(supplier: Supplier): void {
        this.purchaseService.updateDraftField('supplierId', supplier.id);
        this.supplierSearchTerm.set('');
        this.supplierSearchResults.set([]);
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
            quantity: 1,
            unitCost: 0,
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
        if (!item.variantId || !item.stockLocationId || item.quantity! <= 0 || item.unitCost! < 0) {
            return;
        }

        this.purchaseService.addPurchaseItemLocal(item as PurchaseLineItem);
        this.newLineItem.set({
            variantId: '',
            quantity: 1,
            unitCost: 0,
            stockLocationId: '',
        });
    }

    /**
     * Remove line item
     */
    handleRemoveLineItem(index: number): void {
        this.purchaseService.removePurchaseItemLocal(index);
    }

    /**
     * Update line item
     */
    handleUpdateLineItem(index: number, field: keyof PurchaseLineItem, value: any): void {
        this.purchaseService.updatePurchaseItemLocal(index, { [field]: value });
    }

    /**
     * Submit purchase
     */
    async handleSubmitPurchase(): Promise<void> {
        try {
            await this.purchaseService.submitPurchase();
            this.showSuccessMessage.set(true);
            setTimeout(() => {
                this.showSuccessMessage.set(false);
                this.purchaseService.createNewDraft();
            }, 3000);
        } catch (error: any) {
            console.error('Purchase submission failed:', error);
        }
    }

    /**
     * Format currency
     */
    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: 'KES',
        }).format(amount);
    }

    /**
     * Update new line item field
     */
    updateNewLineItem(field: keyof PurchaseLineItem, value: any): void {
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

    /**
     * Handle date change
     */
    handleDateChange(value: string): void {
        this.purchaseService.updateDraftField('purchaseDate', new Date(value));
    }
}

