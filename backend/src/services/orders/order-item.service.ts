import { Injectable, Logger } from '@nestjs/common';
import { ID, Order, OrderService, RequestContext, UserInputError } from '@vendure/core';
import { PriceOverrideService } from './price-override.service';
import { CartItemInput } from './order-creation.service';

/**
 * Order Item Service
 *
 * Handles adding items to orders and applying custom pricing.
 * Separated for single responsibility and testability.
 */
@Injectable()
export class OrderItemService {
  private readonly logger = new Logger('OrderItemService');

  constructor(
    private readonly orderService: OrderService,
    private readonly priceOverrideService: PriceOverrideService
  ) {}

  /**
   * Add items to an order with optional custom pricing
   */
  async addItems(ctx: RequestContext, orderId: ID, items: CartItemInput[]): Promise<void> {
    for (const item of items) {
      // Add item to order
      const addItemResult = await this.orderService.addItemToOrder(
        ctx,
        orderId,
        item.variantId,
        item.quantity
      );

      // Handle errors
      if ('errorCode' in addItemResult) {
        const error = addItemResult as any;
        throw new UserInputError(
          `Failed to add item: ${error.message || error.errorCode || 'Unknown error'}`
        );
      }

      // Apply custom price if provided
      if (item.customLinePrice && item.customLinePrice > 0) {
        await this.applyCustomPrice(ctx, orderId, item);
      }
    }
  }

  /**
   * Apply custom price to an order line
   */
  private async applyCustomPrice(
    ctx: RequestContext,
    orderId: ID,
    item: CartItemInput
  ): Promise<void> {
    // Get updated order to find the order line
    const order = await this.orderService.findOne(ctx, orderId);
    if (!order) {
      throw new UserInputError('Failed to retrieve order after adding item');
    }

    const orderLine = order.lines?.find(line => line.productVariant?.id === item.variantId);

    if (orderLine) {
      await this.priceOverrideService.setOrderLineCustomPrice(ctx, {
        orderLineId: orderLine.id.toString(),
        customLinePrice: item.customLinePrice!,
        reason: item.priceOverrideReason,
      });
    }
  }
}
