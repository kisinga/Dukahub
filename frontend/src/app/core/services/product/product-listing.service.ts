import { inject, Injectable } from '@angular/core';
import { GET_PRODUCTS } from '../../graphql/operations.graphql';
import { ApolloService } from '../apollo.service';
import { ProductStateService } from './product-state.service';

/**
 * Product Listing Service
 *
 * Handles product listing and fetching operations.
 * Manages product list state and processing.
 */
@Injectable({
  providedIn: 'root',
})
export class ProductListingService {
  private readonly apolloService = inject(ApolloService);
  private readonly stateService = inject(ProductStateService);

  /**
   * Fetch all products with optional pagination
   * @param options - Optional pagination and filter options
   */
  async fetchProducts(options?: any): Promise<void> {
    this.stateService.setIsLoading(true);
    this.stateService.setError(null);

    try {
      const client = this.apolloService.getClient();
      const result = await client.query<any>({
        query: GET_PRODUCTS,
        variables: {
          options: options || {
            take: 50,
            skip: 0,
          },
        },
        fetchPolicy: 'network-only',
      });

      const items = result.data?.products?.items || [];
      const total = result.data?.products?.totalItems || 0;

      // Process products to ensure prices are displayed correctly
      const processedItems = items.map((product: any) => ({
        ...product,
        variants:
          product.variants?.map((variant: any) => {
            // Find the KES price from the prices array
            const kesPrice = variant.prices?.find((p: any) => p.currencyCode === 'KES');
            const displayPrice = kesPrice?.price || variant.priceWithTax || variant.price || 0;

            return {
              ...variant,
              // Use the KES price from prices array as the display price
              displayPrice: displayPrice,
              // Keep both price and priceWithTax for compatibility
              price: variant.price,
              priceWithTax: variant.priceWithTax,
              // Extract currency from prices array if available
              currencyCode: kesPrice?.currencyCode || 'KES',
              // Add the KES price for easy access
              kesPrice: displayPrice,
            };
          }) || [],
      }));
      console.log('fetchProducts', result.data?.products?.items);
      this.stateService.setProducts(processedItems);
      this.stateService.setTotalItems(total);
    } catch (error: any) {
      console.error('❌ Failed to fetch products:', error);
      this.stateService.setError(error.message || 'Failed to fetch products');
      this.stateService.setProducts([]);
      this.stateService.setTotalItems(0);
    } finally {
      this.stateService.setIsLoading(false);
    }
  }
}
