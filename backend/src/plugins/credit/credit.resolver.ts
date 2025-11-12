import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';

import {
    ApproveCustomerCreditPermission,
    ManageCustomerCreditLimitPermission
} from './permissions';
import { CreditService, CreditSummary } from './credit.service';

interface ApproveCustomerCreditInput {
    customerId: string;
    approved: boolean;
    creditLimit?: number;
    creditDuration?: number;
}

interface UpdateCustomerCreditLimitInput {
    customerId: string;
    creditLimit: number;
    creditDuration?: number;
}

interface UpdateCreditDurationInput {
    customerId: string;
    creditDuration: number;
}

@Resolver('CreditSummary')
export class CreditResolver {
    constructor(private readonly creditService: CreditService) { }

    @Query()
    @Allow(Permission.ReadCustomer)
    async creditSummary(
        @Ctx() ctx: RequestContext,
        @Args('customerId') customerId: string
    ): Promise<CreditSummary> {
        return this.creditService.getCreditSummary(ctx, customerId);
    }

    @Mutation()
    @Allow(ApproveCustomerCreditPermission.Permission)
    async approveCustomerCredit(
        @Ctx() ctx: RequestContext,
        @Args('input') input: ApproveCustomerCreditInput
    ): Promise<CreditSummary> {
        return this.creditService.approveCustomerCredit(
            ctx,
            input.customerId,
            input.approved,
            input.creditLimit,
            input.creditDuration
        );
    }

    @Mutation()
    @Allow(ManageCustomerCreditLimitPermission.Permission)
    async updateCustomerCreditLimit(
        @Ctx() ctx: RequestContext,
        @Args('input') input: UpdateCustomerCreditLimitInput
    ): Promise<CreditSummary> {
        return this.creditService.updateCustomerCreditLimit(
            ctx,
            input.customerId,
            input.creditLimit,
            input.creditDuration
        );
    }

    @Mutation()
    @Allow(ManageCustomerCreditLimitPermission.Permission)
    async updateCreditDuration(
        @Ctx() ctx: RequestContext,
        @Args('input') input: UpdateCreditDurationInput
    ): Promise<CreditSummary> {
        return this.creditService.updateCreditDuration(
            ctx,
            input.customerId,
            input.creditDuration
        );
    }
}

