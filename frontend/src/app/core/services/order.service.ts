import { Injectable, inject } from '@angular/core';
import {
    ADD_ITEM_TO_DRAFT_ORDER,
    ADD_MANUAL_PAYMENT_TO_ORDER,
    CREATE_DRAFT_ORDER,
    TRANSITION_ORDER_TO_STATE
} from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';

export interface CreateOrderInput {
    cartItems: Array<{
        variantId: string;
        quantity: number;
    }>;
    paymentMethodCode: 'cash-payment' | 'mpesa-payment';
    customerId?: string;
    metadata?: Record<string, any>;
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

    /**
     * Create a complete order with items and payment
     * 
     * Process (Admin API flow):
     * 1. Create draft order
     * 2. Add items sequentially
     * 3. Add manual payment
     * 4. Transition to PaymentSettled state
     * 
     * @param input Order creation data
     * @returns Created order with all details
     */
    async createOrder(input: CreateOrderInput): Promise<Order> {
        try {
            const client = this.apolloService.getClient();

            // 1. Create draft order
            console.log('📋 Creating draft order...');
            const orderResult = await client.mutate({
                mutation: CREATE_DRAFT_ORDER
            });

            if (!orderResult.data?.createDraftOrder) {
                throw new Error('Failed to create draft order');
            }

            const order = orderResult.data.createDraftOrder;
            console.log('✅ Draft order created:', order.code);

            // 2. Add items sequentially
            for (const item of input.cartItems) {
                const itemResult = await client.mutate({
                    mutation: ADD_ITEM_TO_DRAFT_ORDER,
                    variables: {
                        orderId: order.id,
                        input: {
                            productVariantId: item.variantId,
                            quantity: item.quantity
                        }
                    }
                });

                const itemData = itemResult.data?.addItemToDraftOrder;
                if (!itemData || itemData.__typename !== 'Order') {
                    throw new Error(`Failed to add item ${item.variantId} to order`);
                }
            }

            console.log('✅ All items added to order');

            // 3. Add manual payment
            const paymentResult = await client.mutate({
                mutation: ADD_MANUAL_PAYMENT_TO_ORDER,
                variables: {
                    input: {
                        orderId: order.id,
                        method: input.paymentMethodCode,
                        transactionId: `${input.paymentMethodCode.toUpperCase()}-${Date.now()}`,
                        metadata: input.metadata || {}
                    }
                }
            });

            const paymentData = paymentResult.data?.addManualPaymentToOrder;
            if (!paymentData || paymentData.__typename !== 'Order') {
                const error = paymentData as any;
                throw new Error(`Failed to add payment: ${error?.message || 'Unknown error'}`);
            }

            console.log('💳 Payment attached:', input.paymentMethodCode);

            // 4. Transition to PaymentSettled state
            const finalState = 'PaymentSettled';
            const transitionResult = await client.mutate({
                mutation: TRANSITION_ORDER_TO_STATE,
                variables: {
                    id: order.id,
                    state: finalState
                }
            });

            if (!transitionResult.data?.transitionOrderToState ||
                transitionResult.data.transitionOrderToState.__typename !== 'Order') {
                const error = transitionResult.data?.transitionOrderToState as any;
                throw new Error(`State transition failed: ${error?.message || error?.transitionError || 'Unknown error'}`);
            }

            const finalOrder = transitionResult.data.transitionOrderToState;
            console.log('✅ Order completed:', finalOrder.code);

            return finalOrder as Order;
        } catch (error) {
            console.error('❌ Order creation failed:', error);
            throw error;
        }
    }
}

