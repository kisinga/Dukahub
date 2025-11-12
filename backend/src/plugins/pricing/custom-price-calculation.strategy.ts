import { Injectable } from '@nestjs/common';
import { OrderItemPriceCalculationStrategy, PriceCalculationResult, ProductVariant, RequestContext } from '@vendure/core';

@Injectable()
export class CustomPriceCalculationStrategy implements OrderItemPriceCalculationStrategy {
    calculateUnitPrice(
        ctx: RequestContext,
        productVariant: ProductVariant,
        orderLineCustomFields: { [key: string]: any },
        order: any,
        quantity: number
    ): PriceCalculationResult | Promise<PriceCalculationResult> {
        const customLinePrice = orderLineCustomFields?.customLinePrice;

        if (customLinePrice && customLinePrice > 0) {
            // Validate fractional quantity (max 1 decimal place)
            if (this.hasInvalidFractionalQuantity(quantity)) {
                throw new Error('Quantity can have at most 1 decimal place');
            }

            // Check wholesale price limit if set
            const wholesalePrice = (productVariant.customFields as any)?.wholesalePrice;
            if (wholesalePrice && customLinePrice < wholesalePrice) {
                // Don't block the transaction, but log a warning
                console.warn(`Price override below wholesale limit: ${customLinePrice} < ${wholesalePrice} for variant ${productVariant.id}`);
            }

            // Custom line price is total for all items (tax-inclusive)
            // Calculate per-unit price: linePrice / quantity
            return {
                price: customLinePrice / 100 / quantity,
                priceIncludesTax: true, // Custom prices are always tax-inclusive
            };
        }

        // Validate fractional quantity for regular pricing
        if (this.hasInvalidFractionalQuantity(quantity)) {
            throw new Error('Quantity can have at most 1 decimal place');
        }

        // Fall back to variant price
        return {
            price: productVariant.price,
            priceIncludesTax: productVariant.listPriceIncludesTax,
        };
    }

    /**
     * Validates that quantity has at most 1 decimal place
     * Rejects: 0.55, 0.123, 1.234
     * Accepts: 0.5, 1.0, 2.3
     */
    private hasInvalidFractionalQuantity(quantity: number): boolean {
        // Check if quantity has more than 1 decimal place
        const decimalPlaces = (quantity.toString().split('.')[1] || '').length;
        return decimalPlaces > 1;
    }
}
