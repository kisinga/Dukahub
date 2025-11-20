import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, RequestContext } from '@vendure/core';
import { OverridePricePermission } from './price-override.permission';
import {
  PriceOverrideService,
  SetOrderLineCustomPriceInput,
} from '../../services/orders/price-override.service';

@Resolver()
export class PriceOverrideResolver {
  constructor(private priceOverrideService: PriceOverrideService) {}

  @Mutation()
  @Allow(OverridePricePermission.Permission)
  async setOrderLineCustomPrice(
    @Ctx() ctx: RequestContext,
    @Args('input') input: SetOrderLineCustomPriceInput
  ) {
    try {
      const orderLine = await this.priceOverrideService.setOrderLineCustomPrice(ctx, input);
      return {
        __typename: 'OrderLine',
        ...orderLine,
      };
    } catch (error) {
      return {
        __typename: 'Error',
        errorCode: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
