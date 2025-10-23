import { Injectable, inject } from '@angular/core';
import {
    ADD_ITEM_TO_DRAFT_ORDER,
    ADD_MANUAL_PAYMENT_TO_ORDER,
    CREATE_DRAFT_ORDER,
    GET_PAYMENT_METHODS,
    TRANSITION_ORDER_TO_STATE
} from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';
import { OrderSetupService } from './order-setup.service';

export interface CreateOrderInput {
    cartItems: Array<{
        variantId: string;
        quantity: number;
    }>;
    paymentMethodCode: string;
    customerId?: string;
    metadata?: Record<string, any>;
    // New fields:
    isCashierFlow?: boolean;  // True = stay in ArrangingPayment
    isCreditSale?: boolean;   // True = authorize but don't settle payment
}

export interface Order {
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
                finalOrder = orderWithPayment;
            } else if (input.isCashierFlow) {
                // Cashier flow: stay in ArrangingPayment state
                finalOrder = orderWithPayment; // Already in ArrangingPayment
            } else if (input.isCreditSale) {
                // Credit sale: stay in ArrangingPayment state (payment authorized but not settled)
                finalOrder = orderWithPayment; // Already in ArrangingPayment
            } else {
                // Regular cash sale: try to complete if not already done
                if (orderWithPayment.state === 'ArrangingPayment') {
                    finalOrder = await this.transitionOrderState(orderWithPayment.id, 'PaymentSettled');
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
}

