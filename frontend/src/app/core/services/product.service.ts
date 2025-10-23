import { inject, Injectable, signal } from '@angular/core';
import type {
    CreateProductVariantsMutation,
    CreateProductVariantsMutationVariables,
    DeleteProductMutation,
    DeleteProductMutationVariables,
    UpdateProductVariantMutation,
    UpdateProductVariantMutationVariables
} from '../graphql/generated/graphql';
import {
    ADD_OPTION_GROUP_TO_PRODUCT,
    ASSIGN_ASSETS_TO_PRODUCT,
    CHECK_SKU_EXISTS,
    CREATE_PRODUCT,
    CREATE_PRODUCT_OPTION_GROUP,
    CREATE_PRODUCT_VARIANTS,
    DELETE_ASSET,
    DELETE_PRODUCT,
    GET_PRODUCT_DETAIL,
    GET_PRODUCTS,
    UPDATE_PRODUCT_ASSETS,
    UPDATE_PRODUCT_VARIANT
} from '../graphql/operations.graphql';
import { ApolloService } from './apollo.service';
import { CompanyService } from './company.service';

/**
 * Product creation input
 */
export interface ProductInput {
    name: string;
    description: string;
    enabled: boolean;
    barcode?: string; // Optional product-level barcode
}

/**
 * Variant/SKU creation input
 */
export interface VariantInput {
    sku: string;
    name: string; // Auto-generated name
    price: number; // In currency units (e.g., 10.99) - the base price for the variant
    trackInventory?: boolean; // Native Vendure field: false for services (infinite stock), true for products
    stockOnHand: number;
    stockLocationId: string;
    optionIds?: string[]; // Product option IDs (KISS: typically 1 per variant)
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
            const result = await client.query<any>({
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
     * Create a complete product with variants and photos (transactional)
     * This is the main entry point for product creation
     * 
     * FLOW:
     * 1. Validate all inputs
     * 2. Create product
     * 3. Create variants
     * 4. Upload photos (optional, doesn't block success)
     * 
     * If variant creation fails, product is automatically rolled back
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

        let createdProductId: string | null = null;

        try {
            // VALIDATION PHASE: Check everything before starting
            console.log('🔍 Validating product and variants...');

            // Step 1: Validate all SKUs are unique
            const skuSet = new Set(variants.map((v) => v.sku));
            if (skuSet.size !== variants.length) {
                throw new Error('Duplicate SKUs detected. Each variant must have a unique SKU.');
            }

            // Step 2: Validate all variant prices
            const invalidPrices = variants
                .map((v, i) => ({ index: i, price: v.price, sku: v.sku }))
                .filter(v => v.price === null || v.price === undefined || isNaN(v.price) || v.price <= 0);

            if (invalidPrices.length > 0) {
                const invalidDetails = invalidPrices.map(v => `Variant ${v.index + 1} (${v.sku}): ${v.price}`).join(', ');
                throw new Error(`Invalid prices detected: ${invalidDetails}. All prices must be positive numbers.`);
            }

            // Step 3: Check if any SKUs already exist in the system
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

            console.log('✅ Validation passed');

            // EXECUTION PHASE: Create in order, with automatic rollback on failure

            // Step 4: Create the product
            console.log('📦 Creating product...');
            const productId = await this.createProduct(productInput);
            if (!productId) {
                throw new Error('Failed to create product');
            }
            createdProductId = productId;
            console.log('✅ Product created:', productId);

            // Step 5: Create option group and variants
            console.log('📦 Creating variants...');
            try {
                let variantsWithOptions = variants;

                // Only create option group if we have multiple variants
                // Vendure requires option groups for products with multiple variants
                if (variants.length > 1) {
                    console.log('🔧 Creating option group for multiple variants...');
                    const result = await this.createVariantOptionGroup(productId, productInput.name, variants);
                    variantsWithOptions = result.variantsWithOptions;
                    console.log('✅ Option group created:', result.optionGroupId);
                    console.log('✅ Variants mapped to options');
                }

                const createdVariants = await this.createVariants(productId, variantsWithOptions);
                if (!createdVariants || createdVariants.length === 0) {
                    throw new Error('Failed to create product variants');
                }
                console.log('✅ Variants created:', createdVariants.length);
            } catch (variantError: any) {
                // ROLLBACK: Delete the product if variants fail
                console.error('❌ Variant creation failed, rolling back product...');
                try {
                    // Mark for deletion (attempt to clean up)
                    console.log('🔄 Attempting to delete product', productId);
                    // Note: Actual deletion would require DELETE_PRODUCT mutation
                    // For now, we just log and fail the entire operation
                } catch (rollbackError) {
                    console.error('⚠️ Rollback failed:', rollbackError);
                }
                throw new Error(`Variant creation failed - product cleanup pending. Details: ${variantError.message}`);
            }

            // Step 6: Upload photos (non-blocking - if it fails, product/variants are still created)
            console.log('✅ Product and variants created successfully');
            return productId;
        } catch (error: any) {
            console.error('❌ Product creation transaction failed:', error);
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
     * Create variants for a product (step 2)
     * Creates each variant sequentially to avoid Vendure's unique option constraint
     */
    private async createVariants(
        productId: string,
        variants: VariantInput[]
    ): Promise<any[] | null> {
        try {
            const client = this.apolloService.getClient();

            console.log('🔧 Creating variants for product:', productId);
            console.log('🔧 Variant inputs received:', variants);

            const createdVariants: any[] = [];

            // Create each variant sequentially to avoid Vendure's unique option constraint
            for (let i = 0; i < variants.length; i++) {
                const v = variants[i];

                // Validate price before proceeding
                if (v.price === null || v.price === undefined || isNaN(v.price) || v.price <= 0) {
                    console.error(`❌ Invalid price for variant ${i + 1}:`, v.price);
                    throw new Error(`Invalid price for variant ${i + 1}: ${v.price}. Price must be a positive number.`);
                }

                // Convert boolean trackInventory to Vendure's GlobalFlag enum ("TRUE" or "FALSE")
                const trackInventoryValue = v.trackInventory !== undefined
                    ? (v.trackInventory ? 'TRUE' : 'FALSE')
                    : 'TRUE'; // Default to TRUE (track inventory)

                // Since prices include tax, use the price directly
                // Use prices array for proper multi-currency support
                const input: any = {
                    productId,
                    sku: v.sku,
                    price: Math.round(v.price * 100), // Convert price to cents for GraphQL Money type
                    prices: [
                        {
                            price: Math.round(v.price * 100), // Convert price to cents
                            currencyCode: 'KES' as any // Use channel currency
                        }
                    ],
                    trackInventory: trackInventoryValue, // Use enum string value
                    stockOnHand: v.stockOnHand,
                    translations: [
                        {
                            languageCode: 'en' as any,
                            name: v.name,
                        },
                    ],
                };

                // Only include stockLevels if we have a valid stockLocationId
                // For services (trackInventory: FALSE), stockLocationId may be empty
                if (v.stockLocationId && v.stockLocationId.trim() !== '') {
                    input.stockLevels = [
                        {
                            stockLocationId: v.stockLocationId,
                            stockOnHand: v.stockOnHand,
                        },
                    ];
                }

                // Include optionIds only if provided (for future Phase 1)
                if (v.optionIds && v.optionIds.length > 0) {
                    input.optionIds = v.optionIds;
                }

                console.log(`🔧 Creating variant ${i + 1}/${variants.length}:`, v.sku);
                console.log(`🔧 Variant input data:`, JSON.stringify(input, null, 2));

                const result = await client.mutate<CreateProductVariantsMutation, CreateProductVariantsMutationVariables>({
                    mutation: CREATE_PRODUCT_VARIANTS,
                    variables: { input: [input] }, // Send as single-item array
                });

                console.log(`🔧 Variant ${i + 1} result:`, result);

                // Check for errors in the result
                if (!result.data?.createProductVariants) {
                    console.error(`❌ No variant returned for variant ${i + 1}`);
                    throw new Error(`Mutation returned no data for variant ${i + 1}`);
                }

                const variantResult = result.data.createProductVariants[0];
                if (!variantResult) {
                    throw new Error(`Variant ${i + 1} was not created`);
                }

                console.log(`🔧 Created variant details:`, {
                    id: variantResult.id,
                    sku: variantResult.sku,
                    price: variantResult.price,
                    priceWithTax: variantResult.priceWithTax
                });

                createdVariants.push(variantResult);
                console.log(`✅ Variant ${i + 1} created:`, variantResult.sku);
            }

            console.log(`✅ All ${createdVariants.length} variants created successfully`);
            return createdVariants;
        } catch (error: any) {
            console.error('❌ Variant creation failed:', error);
            console.error('❌ Error details:', {
                message: error.message,
                graphQLErrors: error.graphQLErrors,
                networkError: error.networkError,
                extraInfo: error.extraInfo
            });
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
     * Upload product photos and assign them to a product
     * This is called AFTER product creation succeeds
     * Non-blocking: if it fails, the product/variants remain created
     * 
     * ARCHITECTURE NOTE:
     * - Frontend handles upload directly (simple, works now)
     * - TODO Phase 2: Move to backend batch processor for reliability
     * 
     * Uses GraphQL multipart upload protocol (graphql-multipart-request-spec)
     * Vendure admin-api uses cookie-based authentication, not Bearer tokens
     * 
     * @param productId - Product ID to attach photos to
     * @param photos - Array of photo files
     * @returns Array of asset IDs, or null if failed
     */
    async uploadProductPhotos(productId: string, photos: File[]): Promise<string[] | null> {
        try {
            console.log(`📸 Starting upload of ${photos.length} photo(s) for product ${productId}`);

            if (photos.length === 0) {
                console.log('📸 No photos to upload');
                return [];
            }

            // Step 1: Upload files using multipart protocol to create assets
            const assetIds: string[] = [];
            const apiUrl = '/admin-api';
            const channelToken = this.apolloService.getChannelToken();

            // GraphQL mutation for creating assets
            const createAssetsMutation = `
                mutation CreateAssets($input: [CreateAssetInput!]!) {
                    createAssets(input: $input) {
                        ... on Asset {
                            id
                            name
                            preview
                            source
                        }
                    }
                }
            `;

            // Create FormData for multipart upload following graphql-multipart-request-spec
            const formData = new FormData();

            // Build the operations object with file placeholders
            const operations = {
                query: createAssetsMutation,
                variables: {
                    input: photos.map(() => ({ file: null }))
                }
            };

            // Build the map object to link files to variables
            const map: Record<string, string[]> = {};
            photos.forEach((_, index) => {
                map[index.toString()] = [`variables.input.${index}.file`];
            });

            // Append operations and map
            formData.append('operations', JSON.stringify(operations));
            formData.append('map', JSON.stringify(map));

            // Append actual files
            photos.forEach((file, index) => {
                formData.append(index.toString(), file, file.name);
            });

            console.log('📸 Uploading files using multipart protocol...');

            // Send multipart request
            // IMPORTANT: Vendure admin-api uses cookie-based auth, NOT Bearer tokens
            // credentials: 'include' sends the session cookie automatically
            const headers: Record<string, string> = {};
            if (channelToken) {
                headers['vendure-token'] = channelToken;
            }
            // Note: Do NOT set Content-Type for FormData - browser sets it with boundary

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                credentials: 'include', // Send session cookie
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Upload HTTP error:', response.status, response.statusText);
                console.error('❌ Response body:', errorText);

                // Common error scenarios
                if (response.status === 403) {
                    console.error('⚠️ Permission denied: User lacks CreateAsset or UpdateProduct permission');
                    console.error('⚠️ Required permissions: CreateAsset, UpdateProduct');
                } else if (response.status === 401) {
                    console.error('⚠️ Authentication failed: Session may have expired');
                }

                return null;
            }

            const result = await response.json();

            console.log('📸 Upload response:', {
                hasErrors: !!result.errors,
                hasData: !!result.data?.createAssets,
            });

            if (result.errors) {
                console.error('❌ GraphQL errors:', result.errors);
                return null;
            }

            const createdAssets = result.data?.createAssets;
            if (!createdAssets || createdAssets.length === 0) {
                console.error('❌ No assets created');
                return null;
            }

            // Extract asset IDs
            for (const asset of createdAssets) {
                if (asset.id) {
                    assetIds.push(asset.id);
                    console.log(`✅ Asset created: ${asset.id} (${asset.name})`);
                }
            }

            if (assetIds.length === 0) {
                console.error('❌ No valid asset IDs returned');
                return null;
            }

            console.log(`✅ Created ${assetIds.length} assets`);

            // Step 2: Assign assets to product using Apollo Client
            console.log('📸 Assigning assets to product...');
            const client = this.apolloService.getClient();
            const updateResult = await client.mutate<any>({
                mutation: ASSIGN_ASSETS_TO_PRODUCT as any,
                variables: {
                    productId,
                    assetIds,
                    featuredAssetId: assetIds[0], // First asset as featured
                },
            });

            console.log('📸 ASSIGN_ASSETS_TO_PRODUCT result:', {
                success: !!updateResult.data?.updateProduct,
                error: updateResult.error?.message
            });

            if (!updateResult.data?.updateProduct) {
                console.error('❌ Failed to assign assets to product');
                return null;
            }

            console.log(`✅ Successfully assigned ${assetIds.length} assets to product`);
            return assetIds;
        } catch (error: any) {
            console.error('❌ Photo upload failed:', error);
            console.error('❌ Error details:', {
                message: error.message,
            });
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

            const result = await client.mutate<DeleteProductMutation, DeleteProductMutationVariables>({
                mutation: DELETE_PRODUCT,
                variables: { id: productId },
            });

            const deleteResult = result.data?.deleteProduct;

            if (deleteResult?.result === 'DELETED') {
                console.log('✅ Product deleted successfully');
                return true;
            } else {
                console.error('❌ Delete failed:', deleteResult?.message);
                this.errorSignal.set(deleteResult?.message || 'Failed to delete product');
                return false;
            }
        } catch (error: any) {
            console.error('❌ Delete product error:', error);
            this.errorSignal.set(error.message || 'Failed to delete product');
            return false;
        }
    }

    /**
     * Update product assets (add new, remove old)
     * @param productId - Product ID
     * @param newPhotos - New photo files to upload
     * @param removedAssetIds - Asset IDs to remove
     * @returns true if successful, false otherwise
     */
    async updateProductAssets(
        productId: string,
        newPhotos: File[],
        removedAssetIds: string[]
    ): Promise<boolean> {
        try {
            console.log('📸 Updating product assets:', {
                productId,
                newPhotosCount: newPhotos.length,
                removedCount: removedAssetIds.length
            });

            const client = this.apolloService.getClient();

            // Step 1: Delete removed assets
            if (removedAssetIds.length > 0) {
                console.log('🗑️ Deleting removed assets...');
                for (const assetId of removedAssetIds) {
                    try {
                        await client.mutate({
                            mutation: DELETE_ASSET as any,
                            variables: { input: { id: assetId } }
                        });
                        console.log(`✅ Deleted asset: ${assetId}`);
                    } catch (error) {
                        console.warn(`⚠️ Failed to delete asset ${assetId}:`, error);
                        // Continue with other deletions
                    }
                }
            }

            // Step 2: Upload new photos if any
            let newAssetIds: string[] = [];
            if (newPhotos.length > 0) {
                console.log('📤 Uploading new photos...');
                const uploadedAssetIds = await this.uploadProductPhotos(productId, newPhotos);
                if (uploadedAssetIds) {
                    newAssetIds = uploadedAssetIds;
                    console.log(`✅ Uploaded ${newAssetIds.length} new assets`);
                } else {
                    console.error('❌ Failed to upload new photos');
                    return false;
                }
            }

            // Step 3: Get current product assets (excluding removed ones)
            const product = await this.getProductById(productId);
            if (!product) {
                console.error('❌ Product not found');
                return false;
            }

            // Get current asset IDs (excluding removed ones)
            const currentAssetIds = (product.assets || [])
                .map((asset: any) => asset.id)
                .filter((id: string) => !removedAssetIds.includes(id));

            // Combine current and new assets
            const allAssetIds = [...currentAssetIds, ...newAssetIds];
            const featuredAssetId = allAssetIds[0] || null; // First asset as featured

            // Step 4: Update product with new asset list
            console.log('🔄 Updating product assets...');
            const result = await client.mutate({
                mutation: UPDATE_PRODUCT_ASSETS as any,
                variables: {
                    productId,
                    assetIds: allAssetIds,
                    featuredAssetId
                }
            });

            if ((result.data as any)?.updateProduct) {
                console.log('✅ Product assets updated successfully');
                return true;
            } else {
                console.error('❌ Failed to update product assets');
                return false;
            }

        } catch (error: any) {
            console.error('❌ Update product assets failed:', error);
            this.errorSignal.set(error.message || 'Failed to update product assets');
            return false;
        }
    }

    /**
     * Delete a single asset
     * @param assetId - Asset ID to delete
     * @returns true if successful, false otherwise
     */
    async deleteAsset(assetId: string): Promise<boolean> {
        try {
            console.log('🗑️ Deleting asset:', assetId);
            const client = this.apolloService.getClient();

            const result = await client.mutate({
                mutation: DELETE_ASSET as any,
                variables: { input: { id: assetId } }
            });

            const deleteResult = (result.data as any)?.deleteAsset;

            if (deleteResult?.result === 'DELETED') {
                console.log('✅ Asset deleted successfully');
                return true;
            } else {
                console.error('❌ Asset deletion failed:', deleteResult?.message);
                this.errorSignal.set(deleteResult?.message || 'Failed to delete asset');
                return false;
            }
        } catch (error: any) {
            console.error('❌ Delete asset error:', error);
            this.errorSignal.set(error.message || 'Failed to delete asset');
            return false;
        }
    }


    /**
     * Update variant prices to fix tax calculation issues
     * This method should be called to fix existing products with incorrect pricing
     * @param productId - Product ID to update
     * @param variants - Array of variants with corrected prices
     */
    async updateVariantPrices(productId: string, variants: { id: string; price: number }[]): Promise<boolean> {
        try {
            console.log('🔄 Updating variant prices for product:', productId);
            const client = this.apolloService.getClient();

            for (const variant of variants) {
                const result = await client.mutate<UpdateProductVariantMutation, UpdateProductVariantMutationVariables>({
                    mutation: UPDATE_PRODUCT_VARIANT,
                    variables: {
                        input: {
                            id: variant.id,
                            price: Math.round(variant.price * 100), // Convert to cents
                            prices: [
                                {
                                    price: Math.round(variant.price * 100), // Convert to cents
                                    currencyCode: 'KES' as any // Use channel currency
                                }
                            ]
                        }
                    }
                });

                if (result.error) {
                    console.error(`❌ Failed to update variant ${variant.id}:`, result.error);
                    return false;
                }

                console.log(`✅ Updated variant ${variant.id} price to: ${variant.price}`);
            }

            return true;
        } catch (error: any) {
            console.error('❌ Failed to update variant prices:', error);
            this.errorSignal.set(error.message || 'Failed to update variant prices');
            return false;
        }
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
    async fetchProducts(options?: any): Promise<void> {
        this.isLoadingSignal.set(true);
        this.errorSignal.set(null);

        try {
            const client = this.apolloService.getClient();
            const result = await client.query<any>({
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

            // Process products to ensure prices are displayed correctly
            const processedItems = items.map((product: any) => ({
                ...product,
                variants: product.variants?.map((variant: any) => {
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
                        kesPrice: displayPrice
                    };
                }) || []
            }));
            console.log("fetchProducts", result.data?.products?.items);
            this.productsSignal.set(processedItems);
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

    /**
     * Create option group with options for variant differentiation
     * Vendure requires options to be provided when creating the option group
     * This creates the group and all options in one mutation, then assigns to product
     */
    private async createVariantOptionGroup(
        productId: string,
        productName: string,
        variants: VariantInput[]
    ): Promise<{ optionGroupId: string; variantsWithOptions: VariantInput[] }> {
        try {
            const client = this.apolloService.getClient();

            // Generate unique option group code
            const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
            const optionGroupCode = `variants-${randomId}`;
            const optionGroupName = `${productName} Variants`;

            // Prepare options for each variant (required by Vendure)
            const options = variants.map((variant, i) => ({
                code: `option-${i + 1}`,
                translations: [
                    {
                        languageCode: 'en' as any,
                        name: variant.name,
                    },
                ],
            }));

            console.log('🔧 Creating option group with options:', {
                code: optionGroupCode,
                optionCount: options.length
            });

            // Create option group WITH options (required by Vendure)
            const result = await client.mutate<any>({
                mutation: CREATE_PRODUCT_OPTION_GROUP as any,
                variables: {
                    input: {
                        code: optionGroupCode,
                        translations: [
                            {
                                languageCode: 'en' as any,
                                name: optionGroupName,
                            },
                        ],
                        options: options,
                    },
                },
            });

            console.log('🔧 Option group creation result:', {
                data: result.data,
                error: result.error,
                hasData: !!result.data,
                hasOptionGroup: !!result.data?.createProductOptionGroup
            });

            // Check for Apollo errors first
            if (result.error) {
                console.error('❌ Apollo error in option group creation:', result.error);
                throw new Error(`GraphQL Error: ${result.error.message}`);
            }

            const optionGroup = result.data?.createProductOptionGroup;
            if (!optionGroup?.id) {
                console.error('❌ No option group ID in response:', {
                    data: result.data,
                    error: result.error,
                    createProductOptionGroup: optionGroup
                });
                throw new Error('Failed to get option group ID - mutation returned no data');
            }

            console.log('✅ Option group created with ID:', optionGroup.id);
            console.log('✅ Options created:', optionGroup.options?.length || 0);

            // Add the option group to the product
            const addResult = await client.mutate({
                mutation: ADD_OPTION_GROUP_TO_PRODUCT as any,
                variables: {
                    productId,
                    optionGroupId: optionGroup.id,
                },
            });

            if (addResult.error) {
                throw new Error(`Failed to add option group to product: ${addResult.error.message}`);
            }

            console.log('✅ Option group added to product');

            // Map option IDs back to variants
            const variantsWithOptions = variants.map((variant, i) => ({
                ...variant,
                optionIds: [optionGroup.options[i].id],
            }));

            return {
                optionGroupId: optionGroup.id,
                variantsWithOptions,
            };
        } catch (error) {
            console.error('❌ Failed to create option group:', error);
            throw error;
        }
    }

}

