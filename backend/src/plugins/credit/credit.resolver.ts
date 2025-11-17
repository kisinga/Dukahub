import { Logger, Optional } from '@nestjs/common';
import { Args, Mutation, Parent, Query, Resolver } from '@nestjs/graphql';
import { Allow, Ctx, Customer, Permission, RequestContext, Order } from '@vendure/core';

import { ChannelCommunicationService } from '../../services/channels/channel-communication.service';
import { CreditService, CreditSummary } from '../../services/credit/credit.service';
import { OrderCreationService, CreateOrderInput } from '../../services/orders/order-creation.service';
import { OrderCreditValidatorService } from '../../services/orders/order-credit-validator.service';
import {
    ApproveCustomerCreditPermission,
    ManageCustomerCreditLimitPermission
} from './permissions';

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

interface ValidateCreditInput {
    customerId: string;
    estimatedOrderTotal: number;
}

interface CreditValidationResult {
    isValid: boolean;
    error?: string;
    availableCredit: number;
    estimatedOrderTotal: number;
    wouldExceedLimit: boolean;
}

@Resolver('CreditSummary')
export class CreditResolver {
    private readonly logger = new Logger(CreditResolver.name);

    constructor(
        private readonly creditService: CreditService,
        private readonly orderCreationService: OrderCreationService,
        private readonly orderCreditValidator: OrderCreditValidatorService,
        @Optional() private readonly communicationService?: ChannelCommunicationService, // Optional to avoid circular dependency
    ) { }

    @Query()
    @Allow(Permission.ReadCustomer)
    async creditSummary(
        @Ctx() ctx: RequestContext,
        @Args('customerId') customerId: string
    ): Promise<CreditSummary> {
        return this.creditService.getCreditSummary(ctx, customerId);
    }

    @Query()
    @Allow(Permission.ReadCustomer)
    async validateCredit(
        @Ctx() ctx: RequestContext,
        @Args('input') input: ValidateCreditInput
    ): Promise<CreditValidationResult> {
        try {
            // Get credit summary
            const summary = await this.creditService.getCreditSummary(ctx, input.customerId);
            
            // Check approval
            if (!summary.isCreditApproved) {
                return {
                    isValid: false,
                    error: 'Customer is not approved for credit sales.',
                    availableCredit: summary.availableCredit,
                    estimatedOrderTotal: input.estimatedOrderTotal,
                    wouldExceedLimit: false,
                };
            }

            // Check credit limit
            const availableCredit = summary.creditLimit - summary.outstandingAmount;
            const wouldExceedLimit = input.estimatedOrderTotal > availableCredit;

            if (wouldExceedLimit) {
                return {
                    isValid: false,
                    error: `Credit limit would be exceeded. Available: ${availableCredit}, Required: ${input.estimatedOrderTotal}`,
                    availableCredit,
                    estimatedOrderTotal: input.estimatedOrderTotal,
                    wouldExceedLimit: true,
                };
            }

            return {
                isValid: true,
                availableCredit,
                estimatedOrderTotal: input.estimatedOrderTotal,
                wouldExceedLimit: false,
            };
        } catch (error) {
            return {
                isValid: false,
                error: error instanceof Error ? error.message : 'Failed to validate credit',
                availableCredit: 0,
                estimatedOrderTotal: input.estimatedOrderTotal,
                wouldExceedLimit: false,
            };
        }
    }

    @Mutation()
    @Allow(ApproveCustomerCreditPermission.Permission)
    async approveCustomerCredit(
        @Ctx() ctx: RequestContext,
        @Args('input') input: ApproveCustomerCreditInput
    ): Promise<CreditSummary> {
        const result = await this.creditService.approveCustomerCredit(
            ctx,
            input.customerId,
            input.approved,
            input.creditLimit,
            input.creditDuration
        );

        // Send approval notification if approved
        if (input.approved && this.communicationService) {
            await this.communicationService.sendAccountApprovedNotification(
                ctx,
                input.customerId,
                input.creditLimit,
                input.creditDuration
            ).catch(error => {
                // Log but don't fail the mutation
                this.logger.warn(`Failed to send approval notification: ${error instanceof Error ? error.message : String(error)}`);
            });
        }

        return result;
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

    @Mutation()
    @Allow(Permission.CreateOrder)
    async createOrder(
        @Ctx() ctx: RequestContext,
        @Args('input') input: CreateOrderInput
    ): Promise<Order> {
        return this.orderCreationService.createOrder(ctx, input);
    }
}

