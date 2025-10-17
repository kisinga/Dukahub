import { inject, Injectable, signal } from '@angular/core';
import {
    CREATE_CUSTOMER,
    CREATE_CUSTOMER_ADDRESS,
    DELETE_CUSTOMER,
    DELETE_CUSTOMER_ADDRESS,
    GET_CUSTOMER,
    GET_CUSTOMERS,
    UPDATE_CUSTOMER,
    UPDATE_CUSTOMER_ADDRESS
} from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';

/**
 * Customer creation input
 */
export interface CustomerInput {
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber?: string;
    password?: string;
}

/**
 * Customer address input
 */
export interface CustomerAddressInput {
    fullName: string;
    streetLine1: string;
    streetLine2?: string;
    city: string;
    postalCode: string;
    countryCode: string;
    phoneNumber?: string;
}

/**
 * Service for customer management operations
 * 
 * ARCHITECTURE:
 * - Uses Vendure's Customer entity for customer management
 * - Supports address management for each customer
 * - All operations are channel-aware via ApolloService
 */
@Injectable({
    providedIn: 'root',
})
export class CustomerService {
    private readonly apolloService = inject(ApolloService);

    // State for operation in progress
    private readonly isCreatingSignal = signal(false);
    private readonly errorSignal = signal<string | null>(null);
    private readonly isLoadingSignal = signal(false);
    private readonly customersSignal = signal<any[]>([]);
    private readonly totalItemsSignal = signal(0);

    readonly isCreating = this.isCreatingSignal.asReadonly();
    readonly error = this.errorSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly customers = this.customersSignal.asReadonly();
    readonly totalItems = this.totalItemsSignal.asReadonly();

    /**
     * Create a new customer
     * @param input - Customer information
     * @returns Created customer ID or null if failed
     */
    async createCustomer(input: CustomerInput): Promise<string | null> {
        this.isCreatingSignal.set(true);
        this.errorSignal.set(null);

        try {
            const client = this.apolloService.getClient();

            const result = await client.mutate<any>({
                mutation: CREATE_CUSTOMER,
                variables: { input },
            });

            const customer = result.data?.createCustomer;
            if (customer?.id) {
                console.log('✅ Customer created:', customer.id);
                return customer.id;
            } else if (customer?.errorCode) {
                this.errorSignal.set(customer.message || 'Failed to create customer');
                return null;
            } else {
                this.errorSignal.set('Failed to create customer');
                return null;
            }
        } catch (error: any) {
            console.error('❌ Customer creation failed:', error);
            this.errorSignal.set(error.message || 'Failed to create customer');
            return null;
        } finally {
            this.isCreatingSignal.set(false);
        }
    }

    /**
     * Get customer details by ID
     */
    async getCustomerById(id: string): Promise<any | null> {
        try {
            const client = this.apolloService.getClient();
            const result = await client.query<any>({
                query: GET_CUSTOMER,
                variables: { id },
                fetchPolicy: 'network-only',
            });
            return result.data?.customer || null;
        } catch (error) {
            console.error('Failed to fetch customer:', error);
            return null;
        }
    }

    /**
     * Update an existing customer
     * @param id - Customer ID
     * @param input - Updated customer information
     * @returns true if successful, false otherwise
     */
    async updateCustomer(id: string, input: Partial<CustomerInput>): Promise<boolean> {
        try {
            const client = this.apolloService.getClient();

            const result = await client.mutate<any>({
                mutation: UPDATE_CUSTOMER,
                variables: { input: { id, ...input } },
            });

            const customer = result.data?.updateCustomer;
            if (customer?.id) {
                console.log('✅ Customer updated:', customer.id);
                return true;
            } else if (customer?.errorCode) {
                this.errorSignal.set(customer.message || 'Failed to update customer');
                return false;
            } else {
                this.errorSignal.set('Failed to update customer');
                return false;
            }
        } catch (error: any) {
            console.error('❌ Customer update failed:', error);
            this.errorSignal.set(error.message || 'Failed to update customer');
            return false;
        }
    }

    /**
     * Delete a customer by ID
     * @param customerId - The ID of the customer to delete
     * @returns true if successful, false otherwise
     */
    async deleteCustomer(customerId: string): Promise<boolean> {
        try {
            console.log('🗑️ Deleting customer:', customerId);
            const client = this.apolloService.getClient();

            const result = await client.mutate<any>({
                mutation: DELETE_CUSTOMER,
                variables: { id: customerId },
            });

            const deleteResult = result.data?.deleteCustomer;

            if (deleteResult?.result === 'DELETED') {
                console.log('✅ Customer deleted successfully');
                return true;
            } else {
                console.error('❌ Delete failed:', deleteResult?.message);
                this.errorSignal.set(deleteResult?.message || 'Failed to delete customer');
                return false;
            }
        } catch (error: any) {
            console.error('❌ Delete customer error:', error);
            this.errorSignal.set(error.message || 'Failed to delete customer');
            return false;
        }
    }

    /**
     * Create a new address for a customer
     * @param customerId - Customer ID
     * @param input - Address information
     * @returns Created address ID or null if failed
     */
    async createCustomerAddress(customerId: string, input: CustomerAddressInput): Promise<string | null> {
        try {
            const client = this.apolloService.getClient();

            const result = await client.mutate<any>({
                mutation: CREATE_CUSTOMER_ADDRESS,
                variables: { customerId, input },
            });

            const address = result.data?.createCustomerAddress;
            if (address?.id) {
                console.log('✅ Customer address created:', address.id);
                return address.id;
            } else {
                console.error('❌ Failed to create customer address');
                return null;
            }
        } catch (error: any) {
            console.error('❌ Customer address creation failed:', error);
            return null;
        }
    }

    /**
     * Update an existing customer address
     * @param addressId - Address ID
     * @param input - Updated address information
     * @returns true if successful, false otherwise
     */
    async updateCustomerAddress(addressId: string, input: Partial<CustomerAddressInput>): Promise<boolean> {
        try {
            const client = this.apolloService.getClient();

            const result = await client.mutate<any>({
                mutation: UPDATE_CUSTOMER_ADDRESS,
                variables: { input: { id: addressId, ...input } },
            });

            const address = result.data?.updateCustomerAddress;
            if (address?.id) {
                console.log('✅ Customer address updated:', address.id);
                return true;
            } else {
                console.error('❌ Failed to update customer address');
                return false;
            }
        } catch (error: any) {
            console.error('❌ Customer address update failed:', error);
            return false;
        }
    }

    /**
     * Delete a customer address
     * @param addressId - Address ID to delete
     * @returns true if successful, false otherwise
     */
    async deleteCustomerAddress(addressId: string): Promise<boolean> {
        try {
            const client = this.apolloService.getClient();

            const result = await client.mutate<any>({
                mutation: DELETE_CUSTOMER_ADDRESS,
                variables: { id: addressId },
            });

            const deleteResult = result.data?.deleteCustomerAddress;

            if (deleteResult?.success) {
                console.log('✅ Customer address deleted successfully');
                return true;
            } else {
                console.error('❌ Failed to delete customer address');
                return false;
            }
        } catch (error: any) {
            console.error('❌ Delete customer address error:', error);
            return false;
        }
    }

    /**
     * Fetch all customers with optional pagination
     * @param options - Optional pagination and filter options
     */
    async fetchCustomers(options?: any): Promise<void> {
        this.isLoadingSignal.set(true);
        this.errorSignal.set(null);

        try {
            const client = this.apolloService.getClient();

            const result = await client.query<any>({
                query: GET_CUSTOMERS,
                variables: {
                    options: options || {
                        take: 100, // Fetch more to account for filtering
                        skip: 0
                    }
                },
                fetchPolicy: 'network-only',
            });

            const allItems = result.data?.customers?.items || [];
            const allTotal = result.data?.customers?.totalItems || 0;

            // Filter out suppliers (customers with isSupplier = true) on frontend
            const customersOnly = allItems.filter((customer: any) =>
                !customer.customFields?.isSupplier
            );

            this.customersSignal.set(customersOnly);
            this.totalItemsSignal.set(customersOnly.length);
        } catch (error: any) {
            console.error('❌ Failed to fetch customers:', error);
            this.errorSignal.set(error.message || 'Failed to fetch customers');
            this.customersSignal.set([]);
            this.totalItemsSignal.set(0);
        } finally {
            this.isLoadingSignal.set(false);
        }
    }

    /**
     * Clear error state
     */
    clearError(): void {
        this.errorSignal.set(null);
    }
}
