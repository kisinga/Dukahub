import { Injectable, inject } from '@angular/core';
import { GET_PRODUCT, SEARCH_BY_BARCODE, SEARCH_PRODUCTS } from '../../graphql/operations.graphql';
import { ApolloService } from '../apollo.service';
import { ProductCacheService } from './product-cache.service';

/**
 * Product variant for POS
 */
export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  priceWithTax: number; // Tax-inclusive price
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
  private readonly cacheService = inject(ProductCacheService);

  /**
   * Search products by name or SKU (cache-first for offline support)
   */
  async searchProducts(searchTerm: string): Promise<ProductSearchResult[]> {
    // Try cache first if available
    if (this.cacheService.isCacheReady()) {
      const cachedResults = this.cacheService.searchProducts(searchTerm);
      if (cachedResults.length > 0) {
        console.log(`📦 Returning ${cachedResults.length} products from cache`);
        return cachedResults;
      }
    }

    try {
      const client = this.apolloService.getClient();
      const result = await client.query<{
        products: {
          items: any[];
        };
      }>({
        query: SEARCH_PRODUCTS,
        variables: { term: searchTerm },
        fetchPolicy: 'network-only',
      });

      return (
        result.data?.products?.items.map((product: any) => ({
          id: product.id,
          name: product.name,
          featuredAsset: product.featuredAsset
            ? { preview: product.featuredAsset.preview }
            : undefined,
          variants: product.variants.map((v: any) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            priceWithTax: v.priceWithTax?.value || v.priceWithTax || 0, // Handle Money object or direct value
            stockLevel: v.stockOnHand > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
            productId: product.id,
            productName: product.name,
          })),
        })) || []
      );
    } catch (error) {
      console.error('Product search failed:', error);
      return [];
    }
  }

  /**
   * Get product by ID (cache-first for offline ML detection)
   */
  async getProductById(productId: string): Promise<ProductSearchResult | null> {
    // CRITICAL: Try cache first for ML detection (offline support)
    const cachedProduct = this.cacheService.getProductById(productId);
    if (cachedProduct) {
      console.log(`📦 Product ${productId} found in cache`);
      return cachedProduct;
    }

    // Fallback to network if not in cache
    console.log(`🌐 Fetching product ${productId} from network...`);

    try {
      const client = this.apolloService.getClient();
      const result = await client.query<{
        product: any | null;
      }>({
        query: GET_PRODUCT,
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
          priceWithTax: v.priceWithTax?.value || v.priceWithTax || 0, // Handle Money object or direct value
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
    try {
      const client = this.apolloService.getClient();
      const result = await client.query<{
        search: {
          items: any[];
        };
      }>({
        query: SEARCH_BY_BARCODE,
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
        priceWithTax: item.priceWithTax.value, // Keep raw cents for currency service
        stockLevel: 'IN_STOCK',
        productId: item.productId,
        productName: item.productName,
        featuredAsset: item.productAsset ? { preview: item.productAsset.preview } : undefined,
      };
    } catch (error) {
      console.error('Barcode search failed:', error);
      return null;
    }
  }
}
