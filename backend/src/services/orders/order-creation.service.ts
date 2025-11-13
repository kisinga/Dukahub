import { Injectable, Logger } from '@nestjs/common';
import {
    Country,
    Customer,
    ID,
    Order,
    RequestContext,
    TransactionalConnection,
    UserInputError,
} from '@vendure/core';
import { CreditService } from '../credit/credit.service';
import { PriceOverrideService } from './price-override.service';
import { AuditService } from '../../infrastructure/audit/audit.service';
import { OrderService } from '@vendure/core';

export interface CartItemInput {
    variantId: string;
    quantity: number;
    customLinePrice?: number; // Line price in cents
    priceOverrideReason?: string; // Reason code
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
 * This service handles order creation in the backend with transaction support.
 * It wraps Vendure's Admin API operations in a transaction for atomicity.
 * 
 * Note: This service uses a GraphQL client approach to call Admin API mutations
 * since Vendure's internal services may not expose all the methods we need.
 * The actual implementation will call Admin API resolvers through the RequestContext.
 */
@Injectable()
export class OrderCreationService {
    private readonly logger = new Logger('OrderCreationService');

    constructor(
        private readonly connection: TransactionalConnection,
        private readonly creditService: CreditService,
        private readonly priceOverrideService: PriceOverrideService,
        private readonly auditService: AuditService,
        private readonly orderService: OrderService,
    ) {}

    /**
     * Create a complete order with items and payment
     * All operations are wrapped in a transaction
     * 
     * This method will be implemented to call Admin API mutations
     * through the GraphQL API client available in the RequestContext.
     * For now, it's a placeholder that validates inputs and returns an error
     * indicating that the implementation needs to call Admin API mutations.
     */
    async createOrder(ctx: RequestContext, input: CreateOrderInput): Promise<Order> {
        return this.connection.withTransaction(ctx, async (transactionCtx) => {
            try {
                // 1. Validate credit sale if applicable
                if (input.isCreditSale) {
                    if (!input.customerId) {
                        throw new UserInputError('Customer ID is required for credit sales.');
                    }
                    await this.validateCreditSale(transactionCtx, input.customerId, input.cartItems);
                }

                // 2. Validate input
                if (!input.cartItems || input.cartItems.length === 0) {
                    throw new UserInputError('Order must have at least one item.');
                }

                if (!input.paymentMethodCode) {
                    throw new UserInputError('Payment method code is required.');
                }

                // TODO: Implement order creation by calling Admin API mutations
                // The actual implementation should:
                // 1. Call createDraftOrder mutation
                // 2. Call addItemToDraftOrder for each item
                // 3. Apply custom prices if needed
                // 4. Call setCustomerForDraftOrder
                // 5. Call setDraftOrderBillingAddress and setDraftOrderShippingAddress
                // 6. Call transitionOrderToState to ArrangingPayment
                // 7. Call addManualPaymentToOrder
                // 8. Handle fulfillment for cash sales
                // 
                // After order is created, add:
                // - await this.updateOrderCustomFields(transactionCtx, order.id, {
                //     createdByUserId: transactionCtx.activeUserId,
                //     lastModifiedByUserId: transactionCtx.activeUserId
                //   });
                // - await this.auditService.log(transactionCtx, 'order.created', {
                //     entityType: 'Order',
                //     entityId: order.id.toString(),
                //     data: { orderCode: order.code, total: order.total }
                //   });
                // 
                // This requires access to the Admin API GraphQL client through RequestContext
                // or using Vendure's internal services if they're available.

                throw new UserInputError('Order creation not yet implemented. Use Admin API mutations directly.');

            } catch (error) {
                this.logger.error(`Failed to create order: ${error instanceof Error ? error.message : String(error)}`);
                throw error;
            }
        });
    }

    /**
     * Validate credit sale requirements
     */
    private async validateCreditSale(
        ctx: RequestContext,
        customerId: string,
        cartItems: CartItemInput[]
    ): Promise<void> {
        // Get credit summary - this will be validated by payment handler
        // But we can do a preliminary check here
        const creditSummary = await this.creditService.getCreditSummary(ctx, customerId);

        if (!creditSummary.isCreditApproved) {
            throw new UserInputError('Customer is not approved for credit purchases.');
        }

        // Note: Full credit validation (including amount) happens in payment handler
        // This is just a preliminary check
    }

    /**
     * Get or create walk-in customer for cash sales
     */
    private async getOrCreateWalkInCustomer(ctx: RequestContext): Promise<string> {
        const customerRepo = this.connection.getRepository(ctx, Customer);
        
        // Try to find existing walk-in customer
        const walkInCustomer = await customerRepo.findOne({
            where: { emailAddress: 'walkin@pos.local' },
        });

        if (walkInCustomer) {
            return String(walkInCustomer.id);
        }

        // Create walk-in customer if it doesn't exist
        const newCustomer = customerRepo.create({
            firstName: 'Walk-in',
            lastName: 'Customer',
            emailAddress: 'walkin@pos.local',
            phoneNumber: '+1234567890',
        });

        const savedCustomer = await customerRepo.save(newCustomer);
        this.logger.log(`Created walk-in customer: ${savedCustomer.id}`);
        return String(savedCustomer.id);
    }

    /**
     * Update order custom fields for user tracking
     */
    private async updateOrderCustomFields(
        ctx: RequestContext,
        orderId: ID,
        fields: { createdByUserId?: ID; lastModifiedByUserId?: ID }
    ): Promise<void> {
        try {
            await this.orderService.update(ctx, {
                id: orderId,
                customFields: fields,
            });
        } catch (error) {
            this.logger.warn(
                `Failed to update order custom fields for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}

