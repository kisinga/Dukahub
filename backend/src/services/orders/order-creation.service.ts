import { Injectable, Logger, Optional } from '@nestjs/common';
import {
    Customer,
    ID,
    Order,
    OrderService,
    RequestContext,
    TransactionalConnection,
    UserInputError
} from '@vendure/core';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { FinancialService } from '../financial/financial.service';
import { OrderAddressService } from './order-address.service';
import { OrderCreditValidatorService } from './order-credit-validator.service';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { OrderItemService } from './order-item.service';
import { OrderPaymentService } from './order-payment.service';
import { OrderStateService } from './order-state.service';

export interface CartItemInput {
    variantId: string;
    quantity: number;
    customLinePrice?: number; // Line price in cents
    priceOverrideReason?: string;
}

export interface CreateOrderInput {
    cartItems: CartItemInput[];
    paymentMethodCode: string;
    customerId?: string;
    metadata?: Record<string, any>;
    isCreditSale?: boolean;
    isCashierFlow?: boolean;
}

/**
 * Order Creation Service
 * 
 * Orchestrates order creation by composing focused services.
 * Each step is handled by a dedicated service for clarity and testability.
 */
@Injectable()
export class OrderCreationService {
    private readonly logger = new Logger('OrderCreationService');

    constructor(
        private readonly connection: TransactionalConnection,
        private readonly orderService: OrderService,
        private readonly orderCreditValidator: OrderCreditValidatorService,
        private readonly orderItemService: OrderItemService,
        private readonly orderAddressService: OrderAddressService,
        private readonly orderStateService: OrderStateService,
        private readonly orderPaymentService: OrderPaymentService,
        private readonly orderFulfillmentService: OrderFulfillmentService,
        @Optional() private readonly auditService?: AuditService,
        @Optional() private readonly financialService?: FinancialService, // Optional for migration period
    ) { }

    /**
     * Create a complete order with items, addresses, payment, and fulfillment
     * All operations are wrapped in a transaction for atomicity
     */
    async createOrder(ctx: RequestContext, input: CreateOrderInput): Promise<Order> {
        return this.connection.withTransaction(ctx, async (transactionCtx) => {
            try {
                // 1. Validate inputs
                this.validateInput(input);

                // 2. Validate credit approval (basic check)
                const customerId = await this.ensureCustomer(transactionCtx, input.customerId);
                if (input.isCreditSale) {
                    await this.orderCreditValidator.validateCreditApproval(transactionCtx, customerId);
                }

                // 3. Create draft order
                const draftOrder = await this.orderService.createDraft(transactionCtx);
                this.logger.log(`Created draft order: ${draftOrder.code}`);

                // 4. Add items with custom pricing
                await this.orderItemService.addItems(transactionCtx, draftOrder.id, input.cartItems);

                // 5. Set customer
                await this.setCustomer(transactionCtx, draftOrder.id, customerId);

                // 6. Set addresses (from customer if credit sale, default otherwise)
                await this.orderAddressService.setAddresses(
                    transactionCtx,
                    draftOrder.id,
                    input.isCreditSale ? customerId : undefined
                );

                // 7. Refresh order to recalculate totals after custom pricing and addresses
                let order = await this.orderStateService.refreshOrder(transactionCtx, draftOrder.id);

                // 8. Transition to ArrangingPayment (triggers tax recalculation)
                order = await this.orderStateService.transitionToState(
                    transactionCtx,
                    draftOrder.id,
                    'ArrangingPayment'
                );

                // 9. Validate credit limit with actual order total (after taxes, shipping, etc.)
                // This is the final validation - order total is now known
                if (input.isCreditSale) {
                    await this.orderCreditValidator.validateCreditLimitWithOrder(
                        transactionCtx,
                        customerId,
                        order
                    );
                }

                // 10. Handle payment and fulfillment based on order type
                if (input.isCreditSale) {
                    await this.handleCreditSale(transactionCtx, order, customerId);
                } else {
                    await this.handleCashSale(transactionCtx, order, input);
                }

                // 11. Get final order state
                order = await this.orderStateService.refreshOrder(transactionCtx, order.id);

                // 12. Update tracking fields
                await this.updateTrackingFields(transactionCtx, order.id);

                // 13. Log audit events
                await this.logAuditEvents(transactionCtx, order, input, customerId);

                this.logger.log(`Order created successfully: ${order.code}`);
                return order;
            } catch (error) {
                this.logger.error(
                    `Failed to create order: ${error instanceof Error ? error.message : String(error)}`
                );
                throw error;
            }
        });
    }

    /**
     * Validate input parameters
     */
    private validateInput(input: CreateOrderInput): void {
        if (!input.cartItems || input.cartItems.length === 0) {
            throw new UserInputError('Order must have at least one item.');
        }

        if (!input.paymentMethodCode) {
            throw new UserInputError('Payment method code is required.');
        }

        if (input.isCreditSale && !input.customerId) {
            throw new UserInputError('Customer ID is required for credit sales.');
        }
    }


    /**
     * Ensure customer exists, create walk-in if needed
     */
    private async ensureCustomer(ctx: RequestContext, customerId?: string): Promise<string> {
        if (customerId) {
            return customerId;
        }

        return this.getOrCreateWalkInCustomer(ctx);
    }

    /**
     * Set customer on order
     */
    private async setCustomer(ctx: RequestContext, orderId: ID, customerId: string): Promise<void> {
        const orderRepo = this.connection.getRepository(ctx, Order);
        await orderRepo.update(
            { id: orderId },
            { customer: { id: customerId } as Customer }
        );
    }

    /**
     * Handle credit sale: fulfill immediately without payment
     */
    private async handleCreditSale(
        ctx: RequestContext,
        order: Order,
        customerId: string
    ): Promise<void> {
        await this.orderFulfillmentService.fulfillOrder(ctx, order.id);

        // Post credit sale to ledger (single source of truth)
        if (this.financialService) {
            await this.financialService.recordSale(ctx, order);
        }

        if (this.auditService) {
            await this.auditService.log(ctx, 'credit.sale.created', {
                entityType: 'Order',
                entityId: order.id.toString(),
                data: {
                    customerId,
                    orderTotal: order.total,
                    orderCode: order.code,
                    isCreditSale: true,
                },
            });
        }
    }

    /**
     * Handle cash sale: add payment and fulfill
     */
    private async handleCashSale(
        ctx: RequestContext,
        order: Order,
        input: CreateOrderInput
    ): Promise<void> {
        await this.orderPaymentService.addPayment(
            ctx,
            order.id,
            input.paymentMethodCode,
            input.metadata
        );

        await this.orderFulfillmentService.fulfillOrder(ctx, order.id);
    }

    /**
     * Get or create walk-in customer
     */
    private async getOrCreateWalkInCustomer(ctx: RequestContext): Promise<string> {
        const customerRepo = this.connection.getRepository(ctx, Customer);
        let walkInCustomer = await customerRepo.findOne({
            where: { emailAddress: 'walkin@pos.local' },
        });

        if (!walkInCustomer) {
            walkInCustomer = customerRepo.create({
                firstName: 'Walk-in',
                lastName: 'Customer',
                emailAddress: 'walkin@pos.local',
                phoneNumber: '0000000000',
            });
            walkInCustomer = await customerRepo.save(walkInCustomer);
            this.logger.log(`Created walk-in customer: ${walkInCustomer.id}`);
        }

        return String(walkInCustomer.id);
    }

    /**
     * Update order custom fields for tracking
     */
    private async updateTrackingFields(
        ctx: RequestContext,
        orderId: ID
    ): Promise<void> {
        try {
            const orderRepo = this.connection.getRepository(ctx, Order);
            const userId = ctx.activeUserId;

            if (userId) {
                await orderRepo.update(
                    { id: orderId },
                    {
                        customFields: {
                            createdByUserId: userId,
                            lastModifiedByUserId: userId,
                        } as any,
                    }
                );
            }
        } catch (error) {
            this.logger.warn(
                `Failed to update tracking fields: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Log audit events
     */
    private async logAuditEvents(
        ctx: RequestContext,
        order: Order,
        input: CreateOrderInput,
        customerId: string
    ): Promise<void> {
        if (!this.auditService) {
            return;
        }

        await this.auditService.log(ctx, 'order.created', {
            entityType: 'Order',
            entityId: order.id.toString(),
            data: {
                orderCode: order.code,
                total: order.total,
                isCreditSale: input.isCreditSale || false,
                customerId,
            },
        });
    }
}
