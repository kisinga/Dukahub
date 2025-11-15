import { inject, Injectable } from '@angular/core';
import { CREATE_PRODUCT, DELETE_PRODUCT, GET_PRODUCT_DETAIL } from '../../graphql/operations.graphql';
import { ApolloService } from '../apollo.service';
import { ProductInput } from '../product.service';
import { ProductStateService } from './product-state.service';

/**
 * Product API Service
 * 
 * Handles all GraphQL operations for product CRUD.
 * Pure API layer with no business logic.
 */
@Injectable({
    providedIn: 'root',
})
export class ProductApiService {
    private readonly apolloService = inject(ApolloService);
    private readonly stateService = inject(ProductStateService);

    /**
     * Create a product (step 1)
     */
    async createProduct(input: ProductInput): Promise<string | null> {
        try {
            const client = this.apolloService.getClient();

            // Prepare input for Vendure
            const createInput: any = {
                enabled: input.enabled,
                translations: [
                    {
                        languageCode: 'en' as any,
                        name: input.name,
                        slug: this.generateSlug(input.name),
                        description: input.description,
                    },
                ],
                customFields: input.barcode ? { barcode: input.barcode } : undefined,
            };

            const result = await client.mutate<any>({
                mutation: CREATE_PRODUCT,
                variables: { input: createInput },
            });

            return result.data?.createProduct?.id || null;
        } catch (error) {
            console.error('Product creation failed:', error);
            throw error;
        }
    }

    /**
     * Get product details by ID
     */
    async getProductById(id: string): Promise<any | null> {
        try {
            const client = this.apolloService.getClient();
            const result = await client.query<any>({
                query: GET_PRODUCT_DETAIL,
                variables: { id },
                fetchPolicy: 'network-only',
            });
            return result.data?.product || null;
        } catch (error) {
            console.error('Failed to fetch product:', error);
            return null;
        }
    }

    /**
     * Delete a product by ID
     * @param productId - The ID of the product to delete
     * @returns true if successful, false otherwise
     */
    async deleteProduct(productId: string): Promise<boolean> {
        try {
            console.log('🗑️ Deleting product:', productId);
            const client = this.apolloService.getClient();

            const result = await client.mutate<any>({
                mutation: DELETE_PRODUCT,
                variables: { id: productId },
            });

            const deleteResult = result.data?.deleteProduct;

            if (deleteResult?.result === 'DELETED') {
                console.log('✅ Product deleted successfully');
                return true;
            } else {
                console.error('❌ Delete failed:', deleteResult?.message);
                this.stateService.setError(deleteResult?.message || 'Failed to delete product');
                return false;
            }
        } catch (error: any) {
            console.error('❌ Delete product error:', error);
            this.stateService.setError(error.message || 'Failed to delete product');
            return false;
        }
    }

    /**
     * Generate a URL-friendly slug from product name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with hyphens
            .replace(/-+/g, '-'); // Remove duplicate hyphens
    }
}

