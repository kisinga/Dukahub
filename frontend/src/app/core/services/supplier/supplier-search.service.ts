import { inject, Injectable } from '@angular/core';
import { GET_SUPPLIERS } from '../../graphql/operations.graphql';
import { ApolloService } from '../apollo.service';
import { SupplierStateService } from './supplier-state.service';

/**
 * Supplier Search Service
 *
 * Handles supplier search and listing operations.
 * Manages supplier list state.
 */
@Injectable({
  providedIn: 'root',
})
export class SupplierSearchService {
  private readonly apolloService = inject(ApolloService);
  private readonly stateService = inject(SupplierStateService);

  /**
   * Fetch all suppliers with optional pagination
   * @param options - Optional pagination and filter options
   */
  async fetchSuppliers(options?: any): Promise<void> {
    this.stateService.setIsLoading(true);
    this.stateService.setError(null);

    try {
      const client = this.apolloService.getClient();

      const result = await client.query<any>({
        query: GET_SUPPLIERS,
        variables: {
          options: options || {
            take: 100, // Fetch more to account for filtering
            skip: 0,
          },
        },
        fetchPolicy: 'network-only',
      });

      const allItems = result.data?.customers?.items || [];
      const allTotal = result.data?.customers?.totalItems || 0;

      // Filter to only get suppliers (customers with isSupplier = true) on frontend
      const suppliersOnly = allItems.filter(
        (customer: any) => customer.customFields?.isSupplier === true,
      );

      this.stateService.setSuppliers(suppliersOnly);
      this.stateService.setTotalItems(suppliersOnly.length);
    } catch (error: any) {
      console.error('❌ Failed to fetch suppliers:', error);
      this.stateService.setError(error.message || 'Failed to fetch suppliers');
      this.stateService.setSuppliers([]);
      this.stateService.setTotalItems(0);
    } finally {
      this.stateService.setIsLoading(false);
    }
  }
}
