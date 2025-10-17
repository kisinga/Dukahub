import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface ProductCardData {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    featuredAsset?: { preview?: string };
    variants?: Array<{
        id: string;
        name: string;
        sku: string;
        price: number;
        stockOnHand: number;
    }>;
}

export type ProductAction = 'view' | 'edit' | 'purchase' | 'delete';

/**
 * Reusable product card component for mobile view
 * Displays product summary with collapsible details
 */
@Component({
    selector: 'app-product-card',
    imports: [CommonModule],
    templateUrl: './product-card.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCardComponent {
    readonly product = input.required<ProductCardData>();
    readonly action = output<{ action: ProductAction; productId: string }>();

    variantCount(): number {
        return this.product().variants?.length || 0;
    }

    totalStock(): number {
        return this.product().variants?.reduce((sum, v) => sum + (v.stockOnHand || 0), 0) || 0;
    }

    priceRange(): string {
        const variants = this.product().variants;
        if (!variants || variants.length === 0) return 'N/A';

        const prices = variants.map(v => v.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);

        if (minPrice === maxPrice) {
            return this.formatPrice(minPrice);
        }

        return `${this.formatPrice(minPrice)} - ${this.formatPrice(maxPrice)}`;
    }

    getThumbnail(): string {
        return this.product().featuredAsset?.preview || 'https://picsum.photos/200/200';
    }

    private formatPrice(cents: number): string {
        return (cents / 100).toFixed(2);
    }

    onAction(actionType: ProductAction): void {
        this.action.emit({ action: actionType, productId: this.product().id });
    }
}

