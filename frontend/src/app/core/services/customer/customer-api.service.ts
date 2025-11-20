import { inject, Injectable } from '@angular/core';
import {
  CREATE_CUSTOMER,
  DELETE_CUSTOMER,
  GET_CUSTOMER,
  UPDATE_CUSTOMER,
} from '../../graphql/operations.graphql';
import { formatPhoneNumber } from '../../utils/phone.utils';
import { ApolloService } from '../apollo.service';
import { CustomerInput } from '../customer.service';
import { CustomerStateService } from './customer-state.service';

/**
 * Customer API Service
 *
 * Handles all GraphQL operations for customer CRUD.
 * Pure API layer with no business logic.
 */
@Injectable({
  providedIn: 'root',
})
export class CustomerApiService {
  private readonly apolloService = inject(ApolloService);
  private readonly stateService = inject(CustomerStateService);

  /**
   * Create a new customer
   * @param input - Customer information
   * @returns Created customer ID or null if failed
   */
  async createCustomer(input: CustomerInput): Promise<string | null> {
    this.stateService.setIsCreating(true);
    this.stateService.setError(null);

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
        this.stateService.setError(customer.message || 'Failed to create customer');
        return null;
      } else {
        this.stateService.setError('Failed to create customer');
        return null;
      }
    } catch (error: any) {
      console.error('❌ Customer creation failed:', error);
      this.stateService.setError(error.message || 'Failed to create customer');
      return null;
    } finally {
      this.stateService.setIsCreating(false);
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
        this.stateService.setError(customer.message || 'Failed to update customer');
        return false;
      } else {
        this.stateService.setError('Failed to update customer');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Customer update failed:', error);
      this.stateService.setError(error.message || 'Failed to update customer');
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
        this.stateService.setError(deleteResult?.message || 'Failed to delete customer');
        return false;
      }
    } catch (error: any) {
      console.error('❌ Delete customer error:', error);
      this.stateService.setError(error.message || 'Failed to delete customer');
      return false;
    }
  }
}
