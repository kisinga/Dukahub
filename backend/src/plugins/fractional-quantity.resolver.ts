import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, OrderService, Permission, RequestContext } from '@vendure/core';

@Resolver()
export class FractionalQuantityResolver {
    constructor(private orderService: OrderService) { }

    @Mutation()
    @Allow(Permission.UpdateOrder)
    async updateOrderLineQuantity(
        @Ctx() ctx: RequestContext,
        @Args('orderLineId') orderLineId: string,
        @Args('quantity') quantity: number
    ) {
        // Validate fractional quantity (max 1 decimal place)
        if (this.hasInvalidFractionalQuantity(quantity)) {
            throw new Error('Quantity can have at most 1 decimal place');
        }

        // For now, just validate the quantity and return success
        // The actual order line update will be handled by the frontend
        // using the existing order service methods

        return {
            __typename: 'Order',
            id: 'temp',
            lines: []
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
