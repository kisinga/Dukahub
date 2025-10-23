import { Injectable, inject } from '@angular/core';
import { GET_PAYMENT_METHODS } from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';

export interface PaymentMethod {
    id: string;
    code: string;
    name: string;
    description: string;
    enabled: boolean;
    customFields?: {
        icon?: string;
        image?: string;
    };
}

/**
 * Payment Method Service
 * 
 * Handles fetching and managing payment methods for the current channel.
 * Provides dynamic payment method data with icons and images.
 */
@Injectable({ providedIn: 'root' })
export class PaymentMethodService {
    private apolloService = inject(ApolloService);

    /**
     * Fetch all available payment methods for the current channel
     * 
     * @returns Promise<PaymentMethod[]> Array of payment methods with custom fields
     * @throws Error if no payment methods are configured or if there's a network error
     */
    async getPaymentMethods(): Promise<PaymentMethod[]> {
        try {
            const client = this.apolloService.getClient();

            const result = await client.query({
                query: GET_PAYMENT_METHODS,
                fetchPolicy: 'cache-first'
            });

            if (result.data?.paymentMethods?.items) {
                const methods = result.data.paymentMethods.items as PaymentMethod[];

                if (methods.length === 0) {
                    throw new Error('No payment methods are configured. Please configure payment methods in the admin panel.');
                }

                return methods;
            }

            throw new Error('Failed to fetch payment methods from the server.');
        } catch (error) {
            console.error('Failed to fetch payment methods:', error);
            throw error;
        }
    }
}
