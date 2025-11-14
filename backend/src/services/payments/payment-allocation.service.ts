import { Injectable, Logger, Optional } from '@nestjs/common';
import {
    RequestContext,
    TransactionalConnection,
    UserInputError,
    Order,
    OrderService,
    PaymentService,
    ID,
} from '@vendure/core';
import { In } from 'typeorm';
import { AuditService } from '../../infrastructure/audit/audit.service';

export interface PaymentAllocationInput {
    customerId: string;
    paymentAmount: number;
    orderIds?: string[]; // Optional - if not provided, auto-select oldest
}

export interface PaymentAllocationResult {
    ordersPaid: Array<{
        orderId: string;
        orderCode: string;
        amountPaid: number;
    }>;
    remainingBalance: number;
    totalAllocated: number;
}

@Injectable()
export class PaymentAllocationService {
    private readonly logger = new Logger('PaymentAllocationService');

    constructor(
        private readonly connection: TransactionalConnection,
        private readonly orderService: OrderService,
        private readonly paymentService: PaymentService,
        @Optional() private readonly auditService?: AuditService,
    ) {}

    /**
     * Get unpaid orders for a customer (oldest first)
     */
    async getUnpaidOrdersForCustomer(ctx: RequestContext, customerId: string): Promise<Order[]> {
        const orderRepo = this.connection.getRepository(ctx, Order);
        
        const orders = await orderRepo.find({
            where: {
                customer: { id: customerId },
                state: In(['ArrangingPayment', 'Fulfilled', 'PartiallyFulfilled']),
            },
            relations: ['payments'],
            order: {
                createdAt: 'ASC', // Oldest first
            },
        });

        // Filter to only orders that are not fully paid
        return orders.filter(order => {
            const settledPayments = (order.payments || [])
                .filter(p => p.state === 'Settled')
                .reduce((sum, p) => sum + p.amount, 0);
            return order.total > settledPayments;
        });
    }

    /**
     * Allocate payment amount across orders (oldest first by default)
     */
    async allocatePaymentToOrders(
        ctx: RequestContext,
        input: PaymentAllocationInput
    ): Promise<PaymentAllocationResult> {
        return this.connection.withTransaction(ctx, async (transactionCtx) => {
            try {
                // 1. Get unpaid orders
                let unpaidOrders = await this.getUnpaidOrdersForCustomer(transactionCtx, input.customerId);

                // 2. Filter to selected orders if provided
                if (input.orderIds && input.orderIds.length > 0) {
                    unpaidOrders = unpaidOrders.filter(order => 
                        input.orderIds!.includes(order.id.toString())
                    );
                }

                if (unpaidOrders.length === 0) {
                    throw new UserInputError('No unpaid orders found for this customer.');
                }

                // 3. Allocate payment across orders (oldest first)
                const ordersPaid: Array<{ orderId: string; orderCode: string; amountPaid: number }> = [];
                let remainingPayment = input.paymentAmount;

                for (const order of unpaidOrders) {
                    if (remainingPayment <= 0) {
                        break;
                    }

                    // Calculate how much is still owed on this order
                    const settledPayments = (order.payments || [])
                        .filter(p => p.state === 'Settled')
                        .reduce((sum, p) => sum + p.amount, 0);
                    const amountOwed = order.total - settledPayments;

                    if (amountOwed <= 0) {
                        continue; // Order is already fully paid
                    }

                    // Allocate payment to this order (up to what's owed)
                    const amountToAllocate = Math.min(remainingPayment, amountOwed);

                    // Add payment to order using addManualPaymentToOrder
                    const paymentResult = await (this.paymentService as any).addManualPaymentToOrder(
                        transactionCtx,
                        order.id,
                        {
                            method: 'credit-payment',
                            metadata: {
                                paymentType: 'credit',
                                customerId: input.customerId,
                                allocatedAmount: amountToAllocate,
                            },
                        }
                    );

                    if (paymentResult && 'errorCode' in paymentResult) {
                        throw new UserInputError(`Failed to add payment: ${paymentResult.message || paymentResult.errorCode}`);
                    }

                    // Get the payment from the order to settle it
                    const updatedOrder = await this.orderService.findOne(transactionCtx, order.id);
                    if (updatedOrder && updatedOrder.payments) {
                        const payment = updatedOrder.payments.find(p => 
                            p.metadata?.paymentType === 'credit' && 
                            p.metadata?.allocatedAmount === amountToAllocate &&
                            p.state !== 'Settled'
                        );
                        if (payment) {
                            await this.paymentService.settlePayment(transactionCtx, payment.id);
                        }
                    }

                    // Update order custom fields for user tracking
                    await this.updateOrderCustomFields(transactionCtx, order.id, {
                        lastModifiedByUserId: transactionCtx.activeUserId || undefined,
                    });

                    ordersPaid.push({
                        orderId: order.id.toString(),
                        orderCode: order.code,
                        amountPaid: amountToAllocate,
                    });

                    remainingPayment -= amountToAllocate;
                }

                // 4. Calculate remaining balance
                const remainingUnpaidOrders = await this.getUnpaidOrdersForCustomer(transactionCtx, input.customerId);
                const remainingBalance = remainingUnpaidOrders.reduce((sum, order) => {
                    const settledPayments = (order.payments || [])
                        .filter(p => p.state === 'Settled')
                        .reduce((total, p) => total + p.amount, 0);
                    return sum + (order.total - settledPayments);
                }, 0);

                const totalAllocated = input.paymentAmount - remainingPayment;

                // 5. Log audit event
                if (this.auditService) {
                    await this.auditService.log(transactionCtx, 'credit.payment.allocated', {
                        entityType: 'Customer',
                        entityId: input.customerId,
                        data: {
                            paymentAmount: input.paymentAmount,
                            totalAllocated,
                            remainingBalance,
                            ordersPaid: ordersPaid.map(o => ({
                                orderId: o.orderId,
                                orderCode: o.orderCode,
                                amountPaid: o.amountPaid,
                            })),
                            orderIds: input.orderIds || null,
                        },
                    });
                }

                this.logger.log(
                    `Payment allocated: ${totalAllocated} across ${ordersPaid.length} orders for customer ${input.customerId}. Remaining balance: ${remainingBalance}`
                );

                return {
                    ordersPaid,
                    remainingBalance,
                    totalAllocated,
                };
            } catch (error) {
                this.logger.error(
                    `Failed to allocate payment: ${error instanceof Error ? error.message : String(error)}`
                );
                throw error;
            }
        });
    }

    /**
     * Update order custom fields for user tracking
     */
    private async updateOrderCustomFields(
        ctx: RequestContext,
        orderId: ID,
        fields: { lastModifiedByUserId?: ID }
    ): Promise<void> {
        try {
            const orderRepo = this.connection.getRepository(ctx, Order);
            const order = await orderRepo.findOne({ where: { id: orderId }, select: ['id', 'customFields'] });
            if (order) {
                const customFields = (order.customFields as any) || {};
                await orderRepo.update(
                    { id: orderId },
                    { customFields: { ...customFields, ...fields } }
                );
            }
        } catch (error) {
            this.logger.warn(
                `Failed to update order custom fields for order ${orderId}: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}

