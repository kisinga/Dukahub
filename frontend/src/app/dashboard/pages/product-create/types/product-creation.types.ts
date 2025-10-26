export type ItemType = 'product' | 'service';
export type ProductType = 'measured' | 'discrete';

export interface VariantDimension {
    id: string;
    name: string;
    options: string[];
}

export interface ProductCreationState {
    itemType: ItemType;
    productType?: ProductType; // Only for products
    productName: string;
    identificationMethod: 'barcode' | 'label-photos' | null;
    barcode?: string;
    photoCount: number;

    // For MEASURED products
    measurementUnit?: string; // 'kg', 'L', 'm', etc.

    // For DISCRETE products
    variantDimensions: VariantDimension[];
}


