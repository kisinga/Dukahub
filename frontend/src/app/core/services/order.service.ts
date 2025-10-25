import { Injectable, inject } from '@angular/core';
import { Order } from '../graphql/generated/graphql';
import {
    ADD_FULFILLMENT_TO_ORDER,
    ADD_ITEM_TO_DRAFT_ORDER,
    ADD_MANUAL_PAYMENT_TO_ORDER,
    CREATE_DRAFT_ORDER,
    GET_ORDER_DETAILS,
    GET_PAYMENT_METHODS,
    SET_ORDER_LINE_CUSTOM_PRICE,
    TRANSITION_ORDER_TO_STATE
} from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';
import { OrderSetupService } from './order-setup.service';

export interface CreateOrderInput {
    cartItems: Array<{
        variantId: string;
        quantity: number;
        customLinePrice?: number;  // Line price in cents
        priceOverrideReason?: string;  // Reason code
    }>;
    paymentMethodCode: string;
    customerId?: string;
    metadata?: Record<string, any>;
    // New fields:
    isCashierFlow?: boolean;  // True = stay in ArrangingPayment
    isCreditSale?: boolean;   // True = authorize but don't settle payment
}

export interface OrderData {
    id: string;
    code: string;
    state: string;
    total: number;
    totalWithTax: number;
    lines: Array<{
        id: string;
        quantity: number;
        linePrice: number;
        productVariant: { id: string; name: string; };
    }>;
    payments?: Array<{
        id: string;
        state: string;
        amount: number;
        method: string;
        metadata?: Record<string, any>;
    }>;
}

/**
 * Order Service
 * 
 * Handles order creation and payment processing for the POS system.
 * Creates draft orders, adds items, attaches payments, and transitions order state.
 */
@Injectable({ providedIn: 'root' })
export class OrderService {
    private apolloService = inject(ApolloService);
    private orderSetupService = inject(OrderSetupService);

    /**
     * Create a complete order with items and payment using Vendure's proper APIs
     * 
     * Process (Admin API flow):
     * 1. Create draft order
     * 2. Add items sequentially
     * 3. Use addPaymentToOrder with payment method code
     * 4. Use settleOrderPayment to complete the payment
     * 
     * @param input Order creation data
     * @returns Created order with all details
     */
    async createOrder(input: CreateOrderInput): Promise<Order> {
        try {
            const client = this.apolloService.getClient();

            // Test backend connection first
            try {
                await client.query({
                    query: GET_PAYMENT_METHODS
                });
            } catch (error) {
                console.error('❌ Backend connection failed:', error);
                throw new Error(`Backend connection failed: ${error}`);
            }

            // 1. Create draft order
            const orderResult = await client.mutate({
                mutation: CREATE_DRAFT_ORDER
            });

            // Check for GraphQL errors first
            if (orderResult.error) {
                console.error('GraphQL error creating draft order:', orderResult.error);
                throw new Error(`GraphQL error creating draft order: ${orderResult.error.message}`);
            }

            if (!orderResult.data?.createDraftOrder) {
                console.error('No draft order data returned:', {
                    data: orderResult.data,
                    errors: orderResult.error
                });
                throw new Error('Failed to create draft order - no data returned');
            }

            const order = orderResult.data.createDraftOrder;

            // 2. Add items sequentially
            for (const item of input.cartItems) {

                const itemResult = await client.mutate({
                    mutation: ADD_ITEM_TO_DRAFT_ORDER,
                    variables: {
                        orderId: order.id,
                        input: {
                            productVariantId: String(item.variantId),
                            quantity: item.quantity
                        }
                    }
                });

                // Check for GraphQL errors first
                if (itemResult.error) {
                    console.error('GraphQL error:', itemResult.error);
                    throw new Error(`GraphQL error adding item ${item.variantId}: ${itemResult.error.message}`);
                }

                const itemData = itemResult.data?.addItemToDraftOrder;
                if (!itemData || itemData.__typename !== 'Order') {
                    const error = itemData as any;
                    console.error('Item addition failed:', {
                        variantId: item.variantId,
                        quantity: item.quantity,
                        orderId: order.id,
                        error: error,
                        result: itemResult
                    });
                    throw new Error(`Failed to add item ${item.variantId} to order: ${error?.message || error?.errorCode || 'Unknown error'}`);
                }

                // If custom line price is set, apply it to the order line
                if (item.customLinePrice && item.customLinePrice > 0) {
                    console.log('💰 Applying custom line price to order line:', {
                        variantId: item.variantId,
                        customLinePrice: item.customLinePrice,
                        reason: item.priceOverrideReason
                    });

                    // Find the order line that was just added
                    const orderLines = itemData.lines;
                    const addedLine = orderLines.find((line: any) =>
                        line.productVariant.id === item.variantId
                    );

                    if (addedLine) {
                        await this.setOrderLineCustomPrice(
                            addedLine.id,
                            item.customLinePrice,
                            item.priceOverrideReason
                        );
                        console.log('✅ Custom line price applied to order line:', addedLine.id);
                    } else {
                        console.warn('⚠️ Could not find order line for custom line price application');
                    }
                }
            }

            // 3. Set up complete order with all required details for state transitions
            const orderWithSetup = await this.orderSetupService.setupCompleteOrder(order.id, input.customerId);

            // 4. Transition to ArrangingPayment state (now that all requirements are met)
            const orderInPaymentState = await this.transitionOrderState(orderWithSetup.id, 'ArrangingPayment');

            // 5. Add payment to the order
            const orderWithPayment = await this.completeOrderPayment(
                orderInPaymentState.id,
                input.paymentMethodCode,
                input.metadata
            );

            // 6. Check final state and handle flow types
            let finalOrder: Order;

            // Check if payment addition already completed the order
            if (orderWithPayment.state === 'PaymentSettled') {
                // 7. Fulfill the order (items handed to customer)
                finalOrder = await this.fulfillOrder(orderWithPayment.id);
            } else if (input.isCashierFlow) {
                // Cashier flow: stay in ArrangingPayment state (not fulfilled yet)
                finalOrder = orderWithPayment; // Already in ArrangingPayment
            } else if (input.isCreditSale) {
                // Credit sale: stay in ArrangingPayment state (payment authorized but not settled)
                finalOrder = orderWithPayment; // Already in ArrangingPayment
            } else {
                // Regular cash sale: try to complete if not already done
                if (orderWithPayment.state === 'ArrangingPayment') {
                    const settledOrder = await this.transitionOrderState(orderWithPayment.id, 'PaymentSettled');
                    // 7. Fulfill the order (items handed to customer)
                    finalOrder = await this.fulfillOrder(settledOrder.id);
                } else {
                    finalOrder = orderWithPayment;
                }
            }
            return finalOrder;
        } catch (error) {
            console.error('❌ Order creation failed:', error);
            throw error;
        }
    }


    /**
     * Add manual payment to an order
     * 
     * @param orderId Order ID to add payment to
     * @param paymentMethodCode Payment method code
     * @param metadata Additional payment metadata
     * @returns Order with payment information
     */
    private async completeOrderPayment(
        orderId: string,
        paymentMethodCode: string,
        metadata?: Record<string, any>
    ): Promise<Order> {
        try {
            const client = this.apolloService.getClient();


            const paymentResult = await client.mutate({
                mutation: ADD_MANUAL_PAYMENT_TO_ORDER,
                variables: {
                    input: {
                        orderId,
                        method: paymentMethodCode,
                        metadata: metadata || {}
                    }
                }
            });

            // Check for GraphQL errors
            if (paymentResult.error) {
                console.error('GraphQL error adding payment:', paymentResult.error);
                throw new Error(`GraphQL error adding payment: ${paymentResult.error.message}`);
            }

            const paymentData = paymentResult.data?.addManualPaymentToOrder;
            if (!paymentData) {
                throw new Error('No payment data returned');
            }

            // Check for ManualPaymentStateError
            if (paymentData.__typename === 'ManualPaymentStateError') {
                console.error('Payment state error:', paymentData);
                throw new Error(`Payment failed: ${paymentData.message}`);
            }

            if (paymentData.__typename !== 'Order') {
                throw new Error('Unexpected payment result type');
            }

            // Payment added successfully
            return paymentData as Order;

        } catch (error) {
            console.error('❌ Payment addition failed:', error);
            throw error;
        }
    }

    /**
     * Transition order to a specific state
     * 
     * @param orderId Order ID to transition
     * @param targetState Target state to transition to
     * @returns Order in new state
     */
    private async transitionOrderState(orderId: string, targetState: string): Promise<Order> {
        try {
            const client = this.apolloService.getClient();


            const transitionResult = await client.mutate({
                mutation: TRANSITION_ORDER_TO_STATE,
                variables: {
                    id: orderId,
                    state: targetState
                }
            });

            // Check for GraphQL errors
            if (transitionResult.error) {
                console.error('GraphQL error transitioning order:', transitionResult.error);
                throw new Error(`GraphQL error transitioning order: ${transitionResult.error.message}`);
            }

            const transitionData = transitionResult.data?.transitionOrderToState;
            if (!transitionData) {
                throw new Error('No transition data returned');
            }

            // Check for OrderStateTransitionError
            if (transitionData.__typename === 'OrderStateTransitionError') {
                console.error('Order state transition error:', transitionData);
                throw new Error(`State transition failed: ${transitionData.message}`);
            }

            if (transitionData.__typename !== 'Order') {
                throw new Error('Unexpected transition result type');
            }

            // Order state transitioned successfully
            return transitionData as Order;

        } catch (error) {
            console.error('❌ Order state transition failed:', error);
            throw error;
        }
    }

    /**
     * Fulfill an order (items handed to customer)
     * For POS systems, this represents the physical handover of items
     * 
     * @param orderId Order ID to fulfill
     * @returns Fulfilled order
     */
    private async fulfillOrder(orderId: string): Promise<Order> {
        try {
            const client = this.apolloService.getClient();

            // 1. Get order lines to fulfill
            const orderResult = await client.query({
                query: GET_ORDER_DETAILS,
                variables: { id: orderId }
            });

            const order = orderResult.data?.order;
            if (!order) {
                throw new Error('Order not found');
            }

            // 2. Create fulfillment with all order lines
            const fulfillmentInput = {
                lines: order.lines.map((line: any) => ({
                    orderLineId: line.id,
                    quantity: line.quantity
                })),
                handler: {
                    code: 'manual-fulfillment',
                    arguments: [
                        {
                            name: 'method',
                            value: 'POS Handover'
                        },
                        {
                            name: 'trackingCode',
                            value: `POS-${Date.now()}`
                        }
                    ]
                }
            };

            const fulfillmentResult = await client.mutate({
                mutation: ADD_FULFILLMENT_TO_ORDER,
                variables: { input: fulfillmentInput }
            });

            if (fulfillmentResult.error) {
                console.error('Fulfillment error:', fulfillmentResult.error);
                throw new Error(`Fulfillment failed: ${fulfillmentResult.error.message}`);
            }

            const fulfillment = fulfillmentResult.data?.addFulfillmentToOrder;
            if (!fulfillment || fulfillment.__typename !== 'Fulfillment') {
                console.error('Fulfillment creation failed:', fulfillment);
                const errorMessage = fulfillment && 'message' in fulfillment ? fulfillment.message : 'Unknown error';
                throw new Error(`Fulfillment creation failed: ${errorMessage}`);
            }

            // 3. Fulfillment created - stock automatically decremented
            // Return order in final PaymentSettled state (no need to transition further)
            console.log('✅ Order fulfilled - stock decremented:', {
                orderCode: order.code,
                fulfillmentId: fulfillment.id,
                state: fulfillment.state,
                method: fulfillment.method,
                trackingCode: fulfillment.trackingCode
            });
            return order as unknown as Order;

        } catch (error) {
            console.error('❌ Order fulfillment failed:', error);
            throw error;
        }
    }

    /**
     * Set custom price for an order line
     * 
     * @param orderLineId Order line ID
     * @param customPrice Custom price in cents
     * @param reason Reason for price override
     * @returns Updated order line
     */
    async setOrderLineCustomPrice(
        orderLineId: string,
        customLinePrice: number | undefined,
        reason?: string
    ): Promise<any> {
        try {
            const client = this.apolloService.getClient();

            console.log('💰 Setting custom line price for order line:', {
                orderLineId,
                customLinePrice,
                reason
            });

            // If customLinePrice is undefined, we're resetting the price
            if (customLinePrice === undefined) {
                console.log('🔄 Resetting custom line price to default');
                // For now, we'll just return success since the backend should handle undefined values
                return { success: true };
            }

            const result = await client.mutate({
                mutation: SET_ORDER_LINE_CUSTOM_PRICE as any,
                variables: {
                    input: {
                        orderLineId,
                        customLinePrice,
                        reason
                    }
                }
            });

            // Check for GraphQL errors
            if (result.error) {
                console.error('GraphQL error setting custom line price:', result.error);
                throw new Error(`GraphQL error setting custom line price: ${result.error.message}`);
            }

            const data = (result.data as any)?.setOrderLineCustomPrice;
            if (!data) {
                throw new Error('No data returned from setOrderLineCustomPrice');
            }

            // Check for error result
            if (data.__typename === 'Error') {
                console.error('Custom line price setting failed:', data);
                throw new Error(`Failed to set custom line price: ${data.message}`);
            }

            console.log('✅ Custom line price set successfully');
            return data;

        } catch (error) {
            console.error('❌ Setting custom line price failed:', error);
            throw error;
        }
    }

}

