import { inject, Injectable } from '@angular/core';
import {
    CREATE_SUPPLIER,
    DELETE_SUPPLIER,
    GET_SUPPLIER,
    UPDATE_SUPPLIER
} from '../../graphql/operations.graphql';
import { formatPhoneNumber } from '../../utils/phone.utils';
import { ApolloService } from '../apollo.service';
import { SupplierInput } from '../supplier.service';
import { SupplierStateService } from './supplier-state.service';

/**
 * Supplier API Service
 * 
 * Handles all GraphQL operations for supplier CRUD.
 * Pure API layer with no business logic.
 */
@Injectable({
    providedIn: 'root',
})
export class SupplierApiService {
    private readonly apolloService = inject(ApolloService);
    private readonly stateService = inject(SupplierStateService);

    /**
     * Create a new supplier
     * @param input - Supplier information
     * @returns Created supplier ID or null if failed
     */
    async createSupplier(input: SupplierInput): Promise<string | null> {
        this.stateService.setIsCreating(true);
        this.stateService.setError(null);

        try {
            const client = this.apolloService.getClient();

            // Prepare input with only basic customer fields at top level, supplier fields in customFields
            // Normalize phone number to 07XXXXXXXX format
            const supplierInput = {
                firstName: input.firstName,
                lastName: input.lastName,
                emailAddress: input.emailAddress,
                phoneNumber: input.phoneNumber ? formatPhoneNumber(input.phoneNumber) : undefined,
                customFields: {
                    isSupplier: true,
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
                this.stateService.setError(supplier.message || 'Failed to create supplier');
                return null;
            } else {
                this.stateService.setError('Failed to create supplier');
                return null;
            }
        } catch (error: any) {
            console.error('❌ Supplier creation failed:', error);
            this.stateService.setError(error.message || 'Failed to create supplier');
            return null;
        } finally {
            this.stateService.setIsCreating(false);
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
            // Normalize phone number to 07XXXXXXXX format if provided
            const supplierInput = {
                id,
                ...input,
                phoneNumber: input.phoneNumber ? formatPhoneNumber(input.phoneNumber) : input.phoneNumber,
                customFields: {
                    isSupplier: true,
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
                this.stateService.setError(supplier.message || 'Failed to update supplier');
                return false;
            } else {
                this.stateService.setError('Failed to update supplier');
                return false;
            }
        } catch (error: any) {
            console.error('❌ Supplier update failed:', error);
            this.stateService.setError(error.message || 'Failed to update supplier');
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
                this.stateService.setError(deleteResult?.message || 'Failed to delete supplier');
                return false;
            }
        } catch (error: any) {
            console.error('❌ Delete supplier error:', error);
            this.stateService.setError(error.message || 'Failed to delete supplier');
            return false;
        }
    }
}

