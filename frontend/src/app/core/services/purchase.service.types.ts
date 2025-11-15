import { ProductVariant } from './product/product-search.service';

/**
 * Purchase line item interface
 */
export interface PurchaseLineItem {
    variantId: string;
    variant?: ProductVariant; // Optional for display
    quantity: number;
    unitCost: number; // In base currency units (e.g., 10.99)
    stockLocationId: string;
}

/**
 * Purchase draft interface
 */
export interface PurchaseDraft {
    supplierId: string | null;
    purchaseDate: Date;
    referenceNumber: string;
    paymentStatus: 'paid' | 'pending' | 'partial'; // NOTE: This is a placeholder. Actual payment transactions are the source of truth.
    notes: string;
    lines: PurchaseLineItem[];
}

/**
 * Prepopulation data for purchase draft
 */
export interface PurchasePrepopulationData {
    variantId: string;
    quantity?: number; // Optional, defaults to 1
}


