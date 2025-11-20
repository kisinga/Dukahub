import { Injectable } from '@nestjs/common';
import { Resolver, ResolveField, Root } from '@nestjs/graphql';
import { Allow, Ctx, Customer, Permission, RequestContext } from '@vendure/core';
import { CreditService } from '../../services/credit/credit.service';

/**
 * Customer Field Resolver
 *
 * Adds computed fields to the Customer type for credit management.
 */
@Resolver('Customer')
@Injectable()
export class CustomerFieldResolver {
  constructor(private readonly creditService: CreditService) {}

  @ResolveField()
  @Allow(Permission.ReadCustomer)
  async outstandingAmount(@Root() customer: Customer, @Ctx() ctx: RequestContext): Promise<number> {
    // Calculate outstanding amount dynamically for the customer
    const summary = await this.creditService.getCreditSummary(ctx, customer.id);
    return summary.outstandingAmount;
  }
}
