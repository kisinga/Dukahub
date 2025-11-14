import { inject, Injectable, signal } from '@angular/core';
import {
    APPROVE_CUSTOMER_CREDIT,
    CREATE_CUSTOMER,
    CREATE_CUSTOMER_ADDRESS,
    DELETE_CUSTOMER,
    DELETE_CUSTOMER_ADDRESS,
    GET_CREDIT_SUMMARY,
    VALIDATE_CREDIT,
    GET_CUSTOMER,
    GET_CUSTOMERS,
    UPDATE_CREDIT_DURATION,
    UPDATE_CUSTOMER,
    UPDATE_CUSTOMER_ADDRESS,
    UPDATE_CUSTOMER_CREDIT_LIMIT
} from '../graphql/operations.graphql';
import { formatPhoneNumber } from '../utils/phone.utils';
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
 * Credit customer summary interface
 */
export interface CreditCustomerSummary {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    isCreditApproved: boolean;
    creditLimit: number;
    outstandingAmount: number;
    availableCredit: number;
    lastRepaymentDate?: string | null;
    lastRepaymentAmount: number;
    creditDuration: number;
}

interface CustomerRecord {
    id: string;
    firstName: string;
    lastName: string;
    emailAddress?: string | null;
    phoneNumber?: string | null;
    outstandingAmount?: number | null; // Computed field on Customer, not in customFields
    customFields?: {
        isSupplier?: boolean | null;
        supplierType?: string | null;
        contactPerson?: string | null;
        taxId?: string | null;
        paymentTerms?: string | null;
        notes?: string | null;
        isCreditApproved?: boolean | null;
        creditLimit?: number | null;
        lastRepaymentDate?: string | null;
        lastRepaymentAmount?: number | null;
        creditDuration?: number | null;
    } | null;
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

            // Normalize phone number to 07XXXXXXXX format
            const normalizedInput = {
                ...input,
                phoneNumber: input.phoneNumber ? formatPhoneNumber(input.phoneNumber) : undefined,
            };

            const result = await client.mutate<any>({
                mutation: CREATE_CUSTOMER,
                variables: { input: normalizedInput },
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

            // Normalize phone number to 07XXXXXXXX format if provided
            const normalizedInput = {
                ...input,
                phoneNumber: input.phoneNumber ? formatPhoneNumber(input.phoneNumber) : input.phoneNumber,
            };

            const result = await client.mutate<any>({
                mutation: UPDATE_CUSTOMER,
                variables: { input: { id, ...normalizedInput } },
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
     * Search for customers eligible for credit sales.
     */
    async searchCreditCustomers(term: string, take = 50): Promise<CreditCustomerSummary[]> {
        const normalizedTerm = term.trim().toLowerCase();
        if (normalizedTerm.length === 0) {
            return [];
        }

        const client = this.apolloService.getClient();
        const result = await client.query<{ customers: { items: CustomerRecord[] } }>({
            query: GET_CUSTOMERS,
            variables: {
                options: {
                    take,
                    skip: 0,
                    filter: {
                        firstName: { contains: term },
                    },
                },
            },
            fetchPolicy: 'network-only',
        });

        const items = result.data?.customers?.items ?? [];
        return items
            .filter((customer) => Boolean(customer.customFields?.isCreditApproved))
            .map((customer) => this.mapToCreditSummary(customer))
            .filter((customer) => {
                const phone = customer.phone?.toLowerCase() ?? '';
                return (
                    customer.name.toLowerCase().includes(normalizedTerm) ||
                    phone.includes(normalizedTerm)
                );
            })
            .sort((a, b) => b.availableCredit - a.availableCredit)
            .slice(0, 20);
    }

    /**
     * Retrieve up-to-date credit summary for a customer.
     */
    async getCreditSummary(
        customerId: string,
        base?: Partial<CreditCustomerSummary>
    ): Promise<CreditCustomerSummary> {
        const client = this.apolloService.getClient();

        try {
            const result = await client.query<{
                creditSummary: {
                    customerId: string;
                    isCreditApproved: boolean;
                    creditLimit: number;
                    outstandingAmount: number;
                    availableCredit: number;
                    lastRepaymentDate?: string | null;
                    lastRepaymentAmount: number;
                    creditDuration: number;
                };
            }>({
                query: GET_CREDIT_SUMMARY,
                variables: { customerId },
                fetchPolicy: 'network-only',
            });

            const summary = result.data?.creditSummary;
            if (!summary) {
                throw new Error('Credit summary unavailable');
            }

            return {
                id: summary.customerId,
                name: base?.name ?? '',
                phone: base?.phone,
                email: base?.email,
                isCreditApproved: summary.isCreditApproved,
                creditLimit: summary.creditLimit,
                outstandingAmount: summary.outstandingAmount,
                availableCredit: summary.availableCredit,
                lastRepaymentDate: summary.lastRepaymentDate,
                lastRepaymentAmount: summary.lastRepaymentAmount,
                creditDuration: summary.creditDuration,
            };
        } catch (error) {
            console.warn('⚠️ Failed to load credit summary from API, falling back to cached data.', error);
            if (!base) {
                throw error;
            }
            return {
                id: customerId,
                name: base.name ?? '',
                phone: base.phone,
                email: base.email,
                isCreditApproved: base.isCreditApproved ?? false,
                creditLimit: base.creditLimit ?? 0,
                outstandingAmount: base.outstandingAmount ?? 0,
                availableCredit: Math.max(
                    (base.creditLimit ?? 0) - Math.abs(base.outstandingAmount ?? 0),
                    0
                ),
                lastRepaymentDate: base.lastRepaymentDate,
                lastRepaymentAmount: base.lastRepaymentAmount ?? 0,
                creditDuration: base.creditDuration ?? 30,
            };
        }
    }

    /**
     * Validate credit availability for a given order total.
     * Uses backend validation for single source of truth.
     */
    async validateCustomerCredit(
        customerId: string,
        orderTotal: number,
        base?: Partial<CreditCustomerSummary>
    ): Promise<{ summary: CreditCustomerSummary; error?: string }> {
        const client = this.apolloService.getClient();

        try {
            // Call backend validation (single source of truth)
            const validationResult = await client.query<{
                validateCredit: {
                    isValid: boolean;
                    error?: string | null;
                    availableCredit: number;
                    estimatedOrderTotal: number;
                    wouldExceedLimit: boolean;
                };
            }>({
                query: VALIDATE_CREDIT,
                variables: {
                    input: {
                        customerId,
                        estimatedOrderTotal: orderTotal,
                    },
                },
                fetchPolicy: 'network-only', // Always get fresh data
            });

            const validation = validationResult.data?.validateCredit;
            if (!validation) {
                throw new Error('Validation unavailable');
            }

            // Get updated credit summary (with latest outstanding amount)
            const summary = await this.getCreditSummary(customerId, base);

            if (!validation.isValid && validation.error) {
                return {
                    summary,
                    error: validation.error,
                };
            }

            return { summary };
        } catch (error) {
            console.warn('⚠️ Backend validation failed, falling back to frontend check.', error);
            
            // Fallback to frontend validation if backend fails
            const summary = await this.getCreditSummary(customerId, base);

            if (!summary.isCreditApproved) {
                return {
                    summary,
                    error: 'Customer is not approved for credit purchases yet.',
                };
            }

            if (summary.availableCredit < orderTotal) {
                return {
                    summary,
                    error: `Insufficient credit. Available balance: ${summary.availableCredit.toFixed(2)}`,
                };
            }

            return { summary };
        }
    }

    /**
     * Quickly create a customer record for checkout flows.
     */
    async quickCreateCustomer(input: { name: string; phone: string; email?: string }): Promise<string | null> {
        const { firstName, lastName } = this.splitName(input.name);
        return this.createCustomer({
            firstName,
            lastName,
            emailAddress: input.email || '',
            phoneNumber: input.phone,
        });
    }

    async listCreditCustomers(take = 200): Promise<CreditCustomerSummary[]> {
        const client = this.apolloService.getClient();
        const result = await client.query<{ customers: { items: CustomerRecord[] } }>({
            query: GET_CUSTOMERS,
            variables: {
                options: {
                    take,
                    skip: 0,
                    sort: {
                        createdAt: 'DESC',
                    },
                },
            },
            fetchPolicy: 'network-only',
        });

        const items = result.data?.customers?.items ?? [];
        return items.map((customer) => this.mapToCreditSummary(customer));
    }

    async approveCustomerCredit(
        customerId: string,
        approved: boolean,
        creditLimit?: number,
        base?: Partial<CreditCustomerSummary>,
        creditDuration?: number
    ): Promise<CreditCustomerSummary> {
        const client = this.apolloService.getClient();
        try {
            const result = await client.mutate<{
                approveCustomerCredit: {
                    customerId: string;
                    isCreditApproved: boolean;
                    creditLimit: number;
                    outstandingAmount: number;
                    availableCredit: number;
                    lastRepaymentDate?: string | null;
                    lastRepaymentAmount: number;
                    creditDuration: number;
                };
            }>({
                mutation: APPROVE_CUSTOMER_CREDIT,
                variables: {
                    input: {
                        customerId,
                        approved,
                        creditLimit,
                        creditDuration,
                    },
                },
            });

            if (result.error) {
                console.error('❌ GraphQL error:', result.error);
                const errorMessage = result.error.message || 'Unknown error';
                throw new Error(`Failed to update customer credit approval: ${errorMessage}`);
            }

            const summary = result.data?.approveCustomerCredit;
            if (!summary) {
                throw new Error('Failed to update customer credit approval: No data returned.');
            }

            return {
                id: summary.customerId,
                name: base?.name ?? '',
                phone: base?.phone,
                email: base?.email,
                isCreditApproved: summary.isCreditApproved,
                creditLimit: summary.creditLimit,
                outstandingAmount: summary.outstandingAmount,
                availableCredit: summary.availableCredit,
                lastRepaymentDate: summary.lastRepaymentDate,
                lastRepaymentAmount: summary.lastRepaymentAmount,
                creditDuration: summary.creditDuration,
            };
        } catch (error: any) {
            console.error('Error in approveCustomerCredit:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Failed to update customer credit approval: ${error?.message || 'Unknown error'}`);
        }
    }

    async updateCustomerCreditLimit(
        customerId: string,
        creditLimit: number,
        base?: Partial<CreditCustomerSummary>,
        creditDuration?: number
    ): Promise<CreditCustomerSummary> {
        const client = this.apolloService.getClient();
        const result = await client.mutate<{
            updateCustomerCreditLimit: {
                customerId: string;
                isCreditApproved: boolean;
                creditLimit: number;
                outstandingAmount: number;
                availableCredit: number;
                lastRepaymentDate?: string | null;
                lastRepaymentAmount: number;
                creditDuration: number;
            };
        }>({
            mutation: UPDATE_CUSTOMER_CREDIT_LIMIT,
            variables: {
                input: {
                    customerId,
                    creditLimit,
                    creditDuration,
                },
            },
        });

        if (result.error) {
            console.error('❌ GraphQL error:', result.error);
            const errorMessage = result.error.message || 'Unknown error';
            throw new Error(`Failed to update customer credit limit: ${errorMessage}`);
        }

        const summary = result.data?.updateCustomerCreditLimit;
        if (!summary) {
            throw new Error('Failed to update customer credit limit: No data returned.');
        }

        return {
            id: summary.customerId,
            name: base?.name ?? '',
            phone: base?.phone,
            email: base?.email,
            isCreditApproved: summary.isCreditApproved,
            creditLimit: summary.creditLimit,
            outstandingAmount: summary.outstandingAmount,
            availableCredit: summary.availableCredit,
            lastRepaymentDate: summary.lastRepaymentDate,
            lastRepaymentAmount: summary.lastRepaymentAmount,
            creditDuration: summary.creditDuration,
        };
    }

    async updateCreditDuration(
        customerId: string,
        creditDuration: number,
        base?: Partial<CreditCustomerSummary>
    ): Promise<CreditCustomerSummary> {
        const client = this.apolloService.getClient();
        const result = await client.mutate<{
            updateCreditDuration: {
                customerId: string;
                isCreditApproved: boolean;
                creditLimit: number;
                outstandingAmount: number;
                availableCredit: number;
                lastRepaymentDate?: string | null;
                lastRepaymentAmount: number;
                creditDuration: number;
            };
        }>({
            mutation: UPDATE_CREDIT_DURATION,
            variables: {
                input: {
                    customerId,
                    creditDuration,
                },
            },
        });

        if (result.error) {
            console.error('❌ GraphQL error:', result.error);
            const errorMessage = result.error.message || 'Unknown error';
            throw new Error(`Failed to update customer credit duration: ${errorMessage}`);
        }

        const summary = result.data?.updateCreditDuration;
        if (!summary) {
            throw new Error('Failed to update customer credit duration: No data returned.');
        }

        return {
            id: summary.customerId,
            name: base?.name ?? '',
            phone: base?.phone,
            email: base?.email,
            isCreditApproved: summary.isCreditApproved,
            creditLimit: summary.creditLimit,
            outstandingAmount: summary.outstandingAmount,
            availableCredit: summary.availableCredit,
            lastRepaymentDate: summary.lastRepaymentDate,
            lastRepaymentAmount: summary.lastRepaymentAmount,
            creditDuration: summary.creditDuration,
        };
    }

    /**
     * Clear error state
     */
    clearError(): void {
        this.errorSignal.set(null);
    }

    private mapToCreditSummary(customer: CustomerRecord): CreditCustomerSummary {
        const creditLimit = Number(customer.customFields?.creditLimit ?? 0);
        // outstandingAmount is now a computed field on Customer, not in customFields
        const outstandingAmount = Number(customer.outstandingAmount ?? 0);
        const availableCredit = Math.max(creditLimit - Math.abs(outstandingAmount), 0);
        const lastRepaymentDate = customer.customFields?.lastRepaymentDate ?? null;
        const lastRepaymentAmount = Number(customer.customFields?.lastRepaymentAmount ?? 0);
        const creditDuration = Number(customer.customFields?.creditDuration ?? 30);

        return {
            id: customer.id,
            name: this.buildDisplayName(customer),
            phone: customer.phoneNumber ?? undefined,
            email: customer.emailAddress ?? undefined,
            isCreditApproved: Boolean(customer.customFields?.isCreditApproved),
            creditLimit,
            outstandingAmount,
            availableCredit,
            lastRepaymentDate,
            lastRepaymentAmount,
            creditDuration,
        };
    }

    private buildDisplayName(customer: CustomerRecord): string {
        const parts = [customer.firstName, customer.lastName].filter(Boolean);
        return parts.join(' ').trim();
    }

    private splitName(name: string): { firstName: string; lastName: string } {
        const trimmed = name.trim();
        if (!trimmed.includes(' ')) {
            return { firstName: trimmed, lastName: 'POS' };
        }

        const [firstName, ...rest] = trimmed.split(' ');
        return {
            firstName,
            lastName: rest.join(' ') || 'POS',
        };
    }
}
