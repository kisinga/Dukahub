/**
 * Product Stats Utility
 * 
 * Pure functions for calculating product statistics from product data.
 */

export interface ProductStats {
    totalProducts: number;
    totalVariants: number;
    totalStock: number;
    lowStock: number;
}

export interface ProductVariant {
    stockOnHand?: number;
}

export interface Product {
    id: string;
    variants?: ProductVariant[];
}

/**
 * Calculate product stats from an array of products
 * Pure function - no side effects
 * 
 * @param products - Array of products (typically last X items from page or filtered data)
 * @returns ProductStats object with calculated metrics
 */
export function calculateProductStats(products: Product[]): ProductStats {
    const totalProducts = products.length;
    const totalVariants = products.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
    const totalStock = products.reduce((sum, p) =>
        sum + (p.variants?.reduce((vSum, v) => vSum + (v.stockOnHand || 0), 0) || 0), 0
    );
    const lowStock = products.filter(p =>
        p.variants?.some(v => (v.stockOnHand || 0) < 10)
    ).length;

    return { totalProducts, totalVariants, totalStock, lowStock };
}

