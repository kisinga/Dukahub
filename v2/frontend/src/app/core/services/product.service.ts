import { inject, Injectable, signal } from '@angular/core';
import type {
    CheckSkuExistsQuery,
    CreateProductMutation,
    CreateProductMutationVariables,
    CreateProductVariantsMutation,
    CreateProductVariantsMutationVariables,
    GetProductDetailQuery,
    GetProductsQuery,
    GetProductsQueryVariables
} from '../graphql/generated/graphql';
import {
    CHECK_SKU_EXISTS,
    CREATE_PRODUCT,
    CREATE_PRODUCT_VARIANTS,
    GET_PRODUCT_DETAIL,
    GET_PRODUCTS
} from '../graphql/product.graphql';
import { ApolloService } from './apollo.service';
import { CompanyService } from './company.service';

/**
 * Product creation input
 */
export interface ProductInput {
    name: string;
    description: string;
    enabled: boolean;
}

/**
 * Variant/SKU creation input
 */
export interface VariantInput {
    sku: string;
    name: string; // Auto-generated name
    price: number; // In currency units (e.g., 10.99)
    stockOnHand: number;
    stockLocationId: string;
}

/**
 * ProductOptionGroup with options
 */
export interface ProductOptionGroup {
    id: string;
    code: string;
    name: string;
    options: ProductOption[];
}

/**
 * ProductOption within a group
 */
export interface ProductOption {
    id: string;
    code: string;
    name: string;
}


/**
 * Service for product management operations
 * 
 * ARCHITECTURE:
 * - Products are created first, then variants are added
 * - Each variant represents a SKU with its own price and stock
 * - Stock is tracked per variant per location
 * - All operations are channel-aware via ApolloService
 * 
 * FLOW:
 * 1. Create product (basic info)
 * 2. Create variants for the product (SKUs with prices and names)
 * 3. Stock levels are set during variant creation
 */
@Injectable({
    providedIn: 'root',
})
export class ProductService {
    private readonly apolloService = inject(ApolloService);
    private readonly companyService = inject(CompanyService);

    // State for operation in progress
    private readonly isCreatingSignal = signal(false);
    private readonly errorSignal = signal<string | null>(null);
    private readonly isLoadingSignal = signal(false);
    private readonly productsSignal = signal<any[]>([]);
    private readonly totalItemsSignal = signal(0);

    readonly isCreating = this.isCreatingSignal.asReadonly();
    readonly error = this.errorSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly products = this.productsSignal.asReadonly();
    readonly totalItems = this.totalItemsSignal.asReadonly();

    /**
     * Check if a SKU already exists
     * Returns the variant if it exists, null otherwise
     */
    async checkSKUExists(sku: string): Promise<boolean> {
        try {
            const client = this.apolloService.getClient();
            const result = await client.query<CheckSkuExistsQuery>({
                query: CHECK_SKU_EXISTS,
                variables: { sku },
                fetchPolicy: 'network-only',
            });

            return (result.data?.productVariants?.items?.length ?? 0) > 0;
        } catch (error) {
            console.error('SKU check failed:', error);
            return false;
        }
    }

    /**
     * Create a complete product with variants
     * This is the main entry point for product creation
     * 
     * @param productInput - Basic product information
     * @param variants - Array of SKUs/variants to create
     * @returns Created product ID or null if failed
     */
    async createProductWithVariants(
        productInput: ProductInput,
        variants: VariantInput[]
    ): Promise<string | null> {
        this.isCreatingSignal.set(true);
        this.errorSignal.set(null);

        try {
            // Step 1: Validate all SKUs are unique
            const skuSet = new Set(variants.map((v) => v.sku));
            if (skuSet.size !== variants.length) {
                throw new Error('Duplicate SKUs detected. Each variant must have a unique SKU.');
            }

            // Step 2: Check if any SKUs already exist in the system
            const skuChecks = await Promise.all(
                variants.map((v) => this.checkSKUExists(v.sku))
            );
            const existingSKUs = variants
                .filter((_, i) => skuChecks[i])
                .map((v) => v.sku);

            if (existingSKUs.length > 0) {
                throw new Error(
                    `The following SKUs already exist: ${existingSKUs.join(', ')}`
                );
            }

            // Step 3: Create the product
            const productId = await this.createProduct(productInput);
            if (!productId) {
                throw new Error('Failed to create product');
            }

            console.log('✅ Product created:', productId);

            // Step 4: Create variants for the product
            const createdVariants = await this.createVariants(productId, variants);
            if (!createdVariants || createdVariants.length === 0) {
                throw new Error('Failed to create product variants');
            }

            console.log('✅ Variants created:', createdVariants.length);

            return productId;
        } catch (error: any) {
            console.error('❌ Product creation failed:', error);
            this.errorSignal.set(error.message || 'Failed to create product');
            return null;
        } finally {
            this.isCreatingSignal.set(false);
        }
    }

    /**
     * Create a product (step 1)
     */
    private async createProduct(input: ProductInput): Promise<string | null> {
        try {
            const client = this.apolloService.getClient();

            // Prepare input for Vendure
            const createInput: CreateProductMutationVariables['input'] = {
                enabled: input.enabled,
                translations: [
                    {
                        languageCode: 'en' as any,
                        name: input.name,
                        slug: this.generateSlug(input.name),
                        description: input.description,
                    },
                ],
            };

            const result = await client.mutate<CreateProductMutation>({
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
     * Create variants for a product (step 2)
     */
    private async createVariants(
        productId: string,
        variants: VariantInput[]
    ): Promise<any[] | null> {
        try {
            const client = this.apolloService.getClient();

            // Prepare variant inputs for Vendure
            const variantInputs: CreateProductVariantsMutationVariables['input'] = variants.map(
                (v) => ({
                    productId,
                    sku: v.sku,
                    price: Math.round(v.price * 100), // Convert to cents
                    stockOnHand: v.stockOnHand,
                    stockLevels: [
                        {
                            stockLocationId: v.stockLocationId,
                            stockOnHand: v.stockOnHand,
                        },
                    ],
                    translations: [
                        {
                            languageCode: 'en' as any,
                            name: v.name,
                        },
                    ],
                })
            );

            const result = await client.mutate<CreateProductVariantsMutation>({
                mutation: CREATE_PRODUCT_VARIANTS,
                variables: { input: variantInputs },
            });

            return result.data?.createProductVariants || null;
        } catch (error) {
            console.error('Variant creation failed:', error);
            throw error;
        }
    }

    /**
     * Get product details by ID
     */
    async getProductById(id: string): Promise<any | null> {
        try {
            const client = this.apolloService.getClient();
            const result = await client.query<GetProductDetailQuery>({
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

    /**
     * Clear error state
     */
    clearError(): void {
        this.errorSignal.set(null);
    }

    /**
     * Fetch all products with optional pagination
     * @param options - Optional pagination and filter options
     */
    async fetchProducts(options?: GetProductsQueryVariables['options']): Promise<void> {
        this.isLoadingSignal.set(true);
        this.errorSignal.set(null);

        try {
            const client = this.apolloService.getClient();
            const result = await client.query<GetProductsQuery>({
                query: GET_PRODUCTS,
                variables: {
                    options: options || {
                        take: 50,
                        skip: 0
                    }
                },
                fetchPolicy: 'network-only',
            });

            const items = result.data?.products?.items || [];
            const total = result.data?.products?.totalItems || 0;

            this.productsSignal.set(items);
            this.totalItemsSignal.set(total);
        } catch (error: any) {
            console.error('❌ Failed to fetch products:', error);
            this.errorSignal.set(error.message || 'Failed to fetch products');
            this.productsSignal.set([]);
            this.totalItemsSignal.set(0);
        } finally {
            this.isLoadingSignal.set(false);
        }
    }
}

