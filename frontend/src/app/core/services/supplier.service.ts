import { inject, Injectable, signal } from '@angular/core';
import {
    CREATE_SUPPLIER,
    DELETE_SUPPLIER,
    GET_SUPPLIER,
    GET_SUPPLIERS,
    UPDATE_SUPPLIER
} from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';

/**
 * Supplier creation input
 */
export interface SupplierInput {
    firstName: string;
    lastName: string;
    emailAddress: string;
    phoneNumber?: string;
    password?: string;
    // Supplier-specific custom fields
    supplierCode?: string;
    supplierType?: string;
    contactPerson?: string;
    taxId?: string;
    paymentTerms?: string;
    notes?: string;
}

/**
 * Service for supplier management operations
 * 
 * ARCHITECTURE:
 * - Uses Vendure's Customer entity with custom fields for supplier management
 * - Suppliers are customers with isSupplier custom field set to true
 * - All operations are channel-aware via ApolloService
 */
@Injectable({
    providedIn: 'root',
})
export class SupplierService {
    private readonly apolloService = inject(ApolloService);

    // State for operation in progress
    private readonly isCreatingSignal = signal(false);
    private readonly errorSignal = signal<string | null>(null);
    private readonly isLoadingSignal = signal(false);
    private readonly suppliersSignal = signal<any[]>([]);
    private readonly totalItemsSignal = signal(0);

    readonly isCreating = this.isCreatingSignal.asReadonly();
    readonly error = this.errorSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly suppliers = this.suppliersSignal.asReadonly();
    readonly totalItems = this.totalItemsSignal.asReadonly();

    /**
     * Create a new supplier
     * @param input - Supplier information
     * @returns Created supplier ID or null if failed
     */
    async createSupplier(input: SupplierInput): Promise<string | null> {
        this.isCreatingSignal.set(true);
        this.errorSignal.set(null);

        try {
            const client = this.apolloService.getClient();

            // Prepare input with custom fields for supplier
            const supplierInput = {
                ...input,
                customFields: {
                    isSupplier: true,
                    supplierCode: input.supplierCode,
                    supplierType: input.supplierType,
                    contactPerson: input.contactPerson,
                    taxId: input.taxId,
                    paymentTerms: input.paymentTerms,
                    notes: input.notes
                }
            };

            const result = await client.mutate<any>({
                mutation: CREATE_SUPPLIER,
                variables: { input: supplierInput },
            });

            const supplier = result.data?.createCustomer;
            if (supplier?.id) {
                console.log('✅ Supplier created:', supplier.id);
                return supplier.id;
            } else if (supplier?.errorCode) {
                this.errorSignal.set(supplier.message || 'Failed to create supplier');
                return null;
            } else {
                this.errorSignal.set('Failed to create supplier');
                return null;
            }
        } catch (error: any) {
            console.error('❌ Supplier creation failed:', error);
            this.errorSignal.set(error.message || 'Failed to create supplier');
            return null;
        } finally {
            this.isCreatingSignal.set(false);
        }
    }

    /**
     * Get supplier details by ID
     */
    async getSupplierById(id: string): Promise<any | null> {
        try {
            const client = this.apolloService.getClient();
            const result = await client.query<any>({
                query: GET_SUPPLIER,
                variables: { id },
                fetchPolicy: 'network-only',
            });
            return result.data?.customer || null;
        } catch (error) {
            console.error('Failed to fetch supplier:', error);
            return null;
        }
    }

    /**
     * Update an existing supplier
     * @param id - Supplier ID
     * @param input - Updated supplier information
     * @returns true if successful, false otherwise
     */
    async updateSupplier(id: string, input: Partial<SupplierInput>): Promise<boolean> {
        try {
            const client = this.apolloService.getClient();

            // Prepare input with custom fields for supplier
            const supplierInput = {
                id,
                ...input,
                customFields: {
                    isSupplier: true,
                    supplierCode: input.supplierCode,
                    supplierType: input.supplierType,
                    contactPerson: input.contactPerson,
                    taxId: input.taxId,
                    paymentTerms: input.paymentTerms,
                    notes: input.notes
                }
            };

            const result = await client.mutate<any>({
                mutation: UPDATE_SUPPLIER,
                variables: { input: supplierInput },
            });

            const supplier = result.data?.updateCustomer;
            if (supplier?.id) {
                console.log('✅ Supplier updated:', supplier.id);
                return true;
            } else if (supplier?.errorCode) {
                this.errorSignal.set(supplier.message || 'Failed to update supplier');
                return false;
            } else {
                this.errorSignal.set('Failed to update supplier');
                return false;
            }
        } catch (error: any) {
            console.error('❌ Supplier update failed:', error);
            this.errorSignal.set(error.message || 'Failed to update supplier');
            return false;
        }
    }

    /**
     * Delete a supplier by ID
     * @param supplierId - The ID of the supplier to delete
     * @returns true if successful, false otherwise
     */
    async deleteSupplier(supplierId: string): Promise<boolean> {
        try {
            console.log('🗑️ Deleting supplier:', supplierId);
            const client = this.apolloService.getClient();

            const result = await client.mutate<any>({
                mutation: DELETE_SUPPLIER,
                variables: { id: supplierId },
            });

            const deleteResult = result.data?.deleteCustomer;

            if (deleteResult?.result === 'DELETED') {
                console.log('✅ Supplier deleted successfully');
                return true;
            } else {
                console.error('❌ Delete failed:', deleteResult?.message);
                this.errorSignal.set(deleteResult?.message || 'Failed to delete supplier');
                return false;
            }
        } catch (error: any) {
            console.error('❌ Delete supplier error:', error);
            this.errorSignal.set(error.message || 'Failed to delete supplier');
            return false;
        }
    }

    /**
     * Fetch all suppliers with optional pagination
     * @param options - Optional pagination and filter options
     */
    async fetchSuppliers(options?: any): Promise<void> {
        this.isLoadingSignal.set(true);
        this.errorSignal.set(null);

        try {
            const client = this.apolloService.getClient();

            // Filter to only get customers with isSupplier = true
            const filterOptions = {
                ...options,
                filter: {
                    ...options?.filter,
                    customFields: {
                        isSupplier: { eq: true }
                    }
                }
            };

            const result = await client.query<any>({
                query: GET_SUPPLIERS,
                variables: {
                    options: filterOptions || {
                        take: 50,
                        skip: 0,
                        filter: {
                            customFields: {
                                isSupplier: { eq: true }
                            }
                        }
                    }
                },
                fetchPolicy: 'network-only',
            });

            const items = result.data?.customers?.items || [];
            const total = result.data?.customers?.totalItems || 0;

            this.suppliersSignal.set(items);
            this.totalItemsSignal.set(total);
        } catch (error: any) {
            console.error('❌ Failed to fetch suppliers:', error);
            this.errorSignal.set(error.message || 'Failed to fetch suppliers');
            this.suppliersSignal.set([]);
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
