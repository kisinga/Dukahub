import { ProductVariant } from './product-search.service';

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
    paymentStatus: 'paid' | 'pending' | 'partial';
    notes: string;
    lines: PurchaseLineItem[];
}

