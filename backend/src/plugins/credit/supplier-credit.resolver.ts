import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Permission, RequestContext } from '@vendure/core';
import { SupplierCreditService, SupplierCreditSummary } from '../../services/credit/supplier-credit.service';
import { ManageSupplierCreditPurchasesPermission } from './supplier-credit.permissions';

@Resolver()
export class SupplierCreditResolver {
    constructor(
        private readonly supplierCreditService: SupplierCreditService,
    ) {}

    @Query()
    @Allow(Permission.ReadCustomer)
    async supplierCreditSummary(
        @Ctx() ctx: RequestContext,
        @Args('supplierId') supplierId: string
    ): Promise<SupplierCreditSummary> {
        return this.supplierCreditService.getSupplierCreditSummary(ctx, supplierId);
    }

    @Mutation()
    @Allow(ManageSupplierCreditPurchasesPermission.Permission)
    async approveSupplierCredit(
        @Ctx() ctx: RequestContext,
        @Args('input') input: { supplierId: string; approved: boolean; supplierCreditLimit?: number; supplierCreditDuration?: number }
    ): Promise<SupplierCreditSummary> {
        return this.supplierCreditService.approveSupplierCredit(
            ctx,
            input.supplierId,
            input.approved,
            input.supplierCreditLimit,
            input.supplierCreditDuration
        );
    }

    @Mutation()
    @Allow(ManageSupplierCreditPurchasesPermission.Permission)
    async updateSupplierCreditLimit(
        @Ctx() ctx: RequestContext,
        @Args('input') input: { supplierId: string; supplierCreditLimit: number; supplierCreditDuration?: number }
    ): Promise<SupplierCreditSummary> {
        return this.supplierCreditService.updateSupplierCreditLimit(
            ctx,
            input.supplierId,
            input.supplierCreditLimit,
            input.supplierCreditDuration
        );
    }

    @Mutation()
    @Allow(ManageSupplierCreditPurchasesPermission.Permission)
    async updateSupplierCreditDuration(
        @Ctx() ctx: RequestContext,
        @Args('input') input: { supplierId: string; supplierCreditDuration: number }
    ): Promise<SupplierCreditSummary> {
        return this.supplierCreditService.updateSupplierCreditDuration(
            ctx,
            input.supplierId,
            input.supplierCreditDuration
        );
    }
}


