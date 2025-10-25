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
            // Custom line price is total for all items (tax-inclusive)
            // Calculate per-unit price: linePrice / quantity
            return {
                price: customLinePrice / 100 / quantity,
                priceIncludesTax: true, // Custom prices are always tax-inclusive
            };
        }

        // Fall back to variant price
        return {
            price: productVariant.price,
            priceIncludesTax: productVariant.listPriceIncludesTax,
        };
    }
}
