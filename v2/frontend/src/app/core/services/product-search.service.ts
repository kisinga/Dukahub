import { Injectable, inject } from '@angular/core';
import { gql } from '@apollo/client/core';
import { ApolloService } from './apollo.service';

/**
 * Product variant for POS
 */
export interface ProductVariant {
    id: string;
    name: string;
    sku: string;
    price: number;
    priceWithTax: number;
    stockLevel: string;
    productId: string;
    productName: string;
    featuredAsset?: {
        preview: string;
    };
}

/**
 * Product search result
 */
export interface ProductSearchResult {
    id: string;
    name: string;
    variants: ProductVariant[];
    featuredAsset?: {
        preview: string;
    };
}

/**
 * Service for searching and fetching products for POS
 */
@Injectable({
    providedIn: 'root',
})
export class ProductSearchService {
    private readonly apolloService = inject(ApolloService);

    /**
     * Search products by name or SKU
     */
    async searchProducts(searchTerm: string): Promise<ProductSearchResult[]> {
        const query = gql`
            query SearchProducts($term: String!) {
                products(options: { 
                    filter: { 
                        name: { contains: $term }
                    },
                    take: 5 
                }) {
                    items {
                        id
                        name
                        featuredAsset {
                            preview
                        }
                        variants {
                            id
                            name
                            sku
                            price
                            priceWithTax
                            stockOnHand
                        }
                    }
                }
            }
        `;

        try {
            const client = this.apolloService.getClient();
            const result = await client.query<{
                products: {
                    items: any[];
                };
            }>({
                query,
                variables: { term: searchTerm },
                fetchPolicy: 'network-only',
            });

            return result.data?.products?.items.map((product: any) => ({
                id: product.id,
                name: product.name,
                featuredAsset: product.featuredAsset
                    ? { preview: product.featuredAsset.preview }
                    : undefined,
                variants: product.variants.map((v: any) => ({
                    id: v.id,
                    name: v.name,
                    sku: v.sku,
                    price: v.price / 100,
                    priceWithTax: v.priceWithTax / 100,
                    stockLevel: v.stockOnHand > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
                    productId: product.id,
                    productName: product.name,
                })),
            })) || [];
        } catch (error) {
            console.error('Product search failed:', error);
            return [];
        }
    }

    /**
     * Get product by ID
     */
    async getProductById(productId: string): Promise<ProductSearchResult | null> {
        const query = gql`
            query GetProduct($id: ID!) {
                product(id: $id) {
                    id
                    name
                    featuredAsset {
                        preview
                    }
                    variants {
                        id
                        name
                        sku
                        price
                        priceWithTax
                        stockLevels {
                            stockLocationId
                            stockOnHand
                        }
                    }
                }
            }
        `;

        try {
            const client = this.apolloService.getClient();
            const result = await client.query<{
                product: any | null;
            }>({
                query,
                variables: { id: productId },
            });

            if (!result.data?.product) {
                return null;
            }

            const product = result.data.product;
            return {
                id: product.id,
                name: product.name,
                featuredAsset: product.featuredAsset
                    ? { preview: product.featuredAsset.preview }
                    : undefined,
                variants: product.variants.map((v: any) => ({
                    id: v.id,
                    name: v.name,
                    sku: v.sku,
                    price: v.price / 100,
                    priceWithTax: v.priceWithTax / 100,
                    stockLevel: v.stockLevels?.[0]?.stockOnHand > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
                    productId: product.id,
                    productName: product.name,
                })),
            };
        } catch (error) {
            console.error('Failed to fetch product:', error);
            return null;
        }
    }

    /**
     * Search by barcode
     */
    async searchByBarcode(barcode: string): Promise<ProductVariant | null> {
        const query = gql`
            query SearchByBarcode($sku: String!) {
                search(input: { term: $sku, take: 1 }) {
                    items {
                        productId
                        productName
                        productVariantId
                        productVariantName
                        sku
                        price {
                            ... on SinglePrice {
                                value
                            }
                        }
                        priceWithTax {
                            ... on SinglePrice {
                                value
                            }
                        }
                        productAsset {
                            preview
                        }
                    }
                }
            }
        `;

        try {
            const client = this.apolloService.getClient();
            const result = await client.query<{
                search: {
                    items: any[];
                };
            }>({
                query,
                variables: { sku: barcode },
            });

            if (!result.data?.search?.items.length) {
                return null;
            }

            const item = result.data.search.items[0];
            return {
                id: item.productVariantId,
                name: item.productVariantName,
                sku: item.sku,
                price: item.price.value / 100,
                priceWithTax: item.priceWithTax.value / 100,
                stockLevel: 'IN_STOCK',
                productId: item.productId,
                productName: item.productName,
                featuredAsset: item.productAsset
                    ? { preview: item.productAsset.preview }
                    : undefined,
            };
        } catch (error) {
            console.error('Barcode search failed:', error);
            return null;
        }
    }
}

