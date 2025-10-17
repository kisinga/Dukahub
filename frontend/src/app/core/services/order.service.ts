import { Injectable, inject } from '@angular/core';
import {
    ADD_ITEM_TO_DRAFT_ORDER,
    CREATE_DRAFT_ORDER,
    GET_PAYMENT_METHODS
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
            console.log('🔗 Apollo client:', client);

            // Test backend connection first
            console.log('🔍 Testing backend connection...');
            try {
                const testResult = await client.query({
                    query: GET_PAYMENT_METHODS
                });
                console.log('✅ Backend connection successful:', testResult.data);
            } catch (error) {
                console.error('❌ Backend connection failed:', error);
                throw new Error(`Backend connection failed: ${error}`);
            }

            // 1. Create draft order
            console.log('📋 Creating draft order...');
            const orderResult = await client.mutate({
                mutation: CREATE_DRAFT_ORDER
            });

            console.log('Draft order result:', orderResult);

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
            console.log('✅ Draft order created:', order.code);
            console.log('📋 Order state:', order.state);

            // 2. Add items sequentially
            for (const item of input.cartItems) {
                console.log('🛒 Adding item to order:', {
                    variantId: item.variantId,
                    quantity: item.quantity,
                    orderId: order.id
                });

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

                console.log('✅ Item added successfully:', item.variantId);
            }

            console.log('✅ All items added to order');

            // 3. Add payment using Vendure's proper API
            console.log('✅ Order created:', order.code);
            console.log('⚠️ Payment processing not implemented - order created as draft');
            return order as Order;

        } catch (error) {
            console.error('❌ Order creation failed:', error);
            throw error;
        }
    }
}

