import { Injectable, inject } from '@angular/core';
import {
    CREATE_CUSTOMER,
    SET_CUSTOMER_FOR_DRAFT_ORDER,
    SET_DRAFT_ORDER_BILLING_ADDRESS,
    SET_DRAFT_ORDER_SHIPPING_ADDRESS
} from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';


export interface Customer {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress: string;
}

export interface Order {
    id: string;
    code: string;
    state: string;
    total: number;
    totalWithTax: number;
}

/**
 * Order Setup Service
 * 
 * Handles the complete setup of draft orders to meet Vendure's requirements
 * for state transitions. This includes setting customers, addresses, and shipping methods.
 */
@Injectable({ providedIn: 'root' })
export class OrderSetupService {
    private apolloService = inject(ApolloService);

    /**
     * Set up a complete order with all required details for state transitions
     * 
     * @param orderId Order ID to set up
     * @param customerId Optional customer ID (will create default if not provided)
     * @returns Order with all required details set
     */
    async setupCompleteOrder(orderId: string, customerId?: string): Promise<Order> {
        try {
            // 1. Set customer for the order
            const orderWithCustomer = await this.setCustomerForOrder(orderId, customerId);

            // 2. Set addresses for the order (minimal/store address)
            const orderWithAddresses = await this.setOrderAddresses(orderWithCustomer.id);

            // 3. Done! No shipping setup needed - system-wide disabled
            return orderWithAddresses;

        } catch (error) {
            console.error('❌ Order setup failed:', error);
            throw error;
        }
    }


    /**
     * Create a default customer for walk-in orders
     * 
     * @returns Created customer
     */
    async createDefaultCustomer(): Promise<Customer> {
        try {
            const client = this.apolloService.getClient();

            const customerResult = await client.mutate({
                mutation: CREATE_CUSTOMER,
                variables: {
                    input: {
                        firstName: 'Walk-in',
                        lastName: 'Customer',
                        emailAddress: `walkin-${Date.now()}@example.com`,
                        phoneNumber: '+1234567890'
                    }
                }
            });

            if (customerResult.error) {
                console.error('GraphQL error creating customer:', customerResult.error);
                throw new Error(`GraphQL error creating customer: ${customerResult.error.message}`);
            }

            const customerData = customerResult.data?.createCustomer;
            if (!customerData || customerData.__typename !== 'Customer') {
                throw new Error('Failed to create default customer');
            }

            // Default customer created
            return customerData as Customer;

        } catch (error) {
            console.error('❌ Creating default customer failed:', error);
            throw error;
        }
    }

    /**
     * Set customer for a draft order
     * 
     * @param orderId Order ID to set customer for
     * @param customerId Customer ID (optional, will create default if not provided)
     * @returns Order with customer set
     */
    private async setCustomerForOrder(orderId: string, customerId?: string): Promise<Order> {
        try {
            const client = this.apolloService.getClient();

            let finalCustomerId = customerId;

            // If no customer provided, create a default one
            if (!finalCustomerId) {
                const defaultCustomer = await this.createDefaultCustomer();
                finalCustomerId = defaultCustomer.id;
            }


            const customerResult = await client.mutate({
                mutation: SET_CUSTOMER_FOR_DRAFT_ORDER,
                variables: {
                    orderId,
                    customerId: finalCustomerId
                }
            });

            if (customerResult.error) {
                console.error('GraphQL error setting customer:', customerResult.error);
                throw new Error(`GraphQL error setting customer: ${customerResult.error.message}`);
            }

            const customerData = customerResult.data?.setCustomerForDraftOrder;
            if (!customerData) {
                throw new Error('No customer data returned');
            }

            // Check for EmailAddressConflictError
            if (customerData.__typename === 'EmailAddressConflictError') {
                console.error('Customer conflict error:', customerData);
                throw new Error(`Customer conflict: ${customerData.message}`);
            }

            if (customerData.__typename !== 'Order') {
                throw new Error('Unexpected customer result type');
            }

            // Customer set successfully
            return customerData as unknown as Order;

        } catch (error) {
            console.error('❌ Setting customer failed:', error);
            throw error;
        }
    }

    /**
     * Set billing and shipping addresses for a draft order
     * 
     * @param orderId Order ID to set addresses for
     * @returns Order with addresses set
     */
    private async setOrderAddresses(orderId: string): Promise<Order> {
        try {
            const client = this.apolloService.getClient();


            // Set a default address for both billing and shipping
            const defaultAddress = {
                fullName: 'Walk-in Customer',
                streetLine1: 'Store Location',
                city: 'Local City',
                postalCode: '12345',
                countryCode: 'US'
            };

            // Set billing address
            const billingResult = await client.mutate({
                mutation: SET_DRAFT_ORDER_BILLING_ADDRESS,
                variables: {
                    orderId,
                    input: defaultAddress
                }
            });

            if (billingResult.error) {
                console.error('GraphQL error setting billing address:', billingResult.error);
                throw new Error(`GraphQL error setting billing address: ${billingResult.error.message}`);
            }

            // Set shipping address
            const shippingResult = await client.mutate({
                mutation: SET_DRAFT_ORDER_SHIPPING_ADDRESS,
                variables: {
                    orderId,
                    input: defaultAddress
                }
            });

            if (shippingResult.error) {
                console.error('GraphQL error setting shipping address:', shippingResult.error);
                throw new Error(`GraphQL error setting shipping address: ${shippingResult.error.message}`);
            }

            // Addresses set successfully
            return shippingResult.data?.setDraftOrderShippingAddress as unknown as Order;

        } catch (error) {
            console.error('❌ Setting addresses failed:', error);
            throw error;
        }
    }

}
