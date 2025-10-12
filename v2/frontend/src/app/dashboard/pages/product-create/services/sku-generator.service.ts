import { Injectable } from '@angular/core';
import { OptionItem } from '../components/option-selector.component';

/**
 * SKU Generator Service
 * 
 * Responsible for generating and formatting SKU codes.
 * Pure logic, no side effects - easy to test and reason about.
 */
@Injectable({
    providedIn: 'root'
})
export class SkuGeneratorService {
    /**
     * Generate product SKU prefix from product name
     * Ensures SKUs are globally unique across all products
     * 
     * @example "Red Shoes" => "REDS"
     * @example "Cola 500ml" => "COLA"
     */
    generateProductPrefix(productName: string): string {
        if (!productName?.trim()) {
            return 'PROD';
        }

        // Take first 4 characters, remove spaces, uppercase
        return productName
            .trim()
            .substring(0, 4)
            .toUpperCase()
            .replace(/\s/g, '')
            .replace(/[^A-Z0-9]/g, ''); // Remove special chars
    }

    /**
     * Generate variant SKU from product prefix and selected options
     * 
     * @example generateVariantSku("COLA", [{suggestedSku: "500ML"}, {suggestedSku: "BTL"}])
     *          => "COLA-500ML-BTL"
     */
    generateVariantSku(productPrefix: string, options: OptionItem[]): string {
        const skuParts = options
            .map(opt => opt.suggestedSku)
            .filter(Boolean);

        if (skuParts.length === 0) {
            return `${productPrefix}-VAR`;
        }

        return `${productPrefix}-${skuParts.join('-')}`;
    }

    /**
     * Generate custom SKU for manually added variants
     * 
     * @example generateCustomSku("COLA", 1) => "COLA-CUSTOM1"
     */
    generateCustomSku(productPrefix: string, count: number): string {
        return `${productPrefix}-CUSTOM${count}`;
    }

    /**
     * Format option name for display
     * Makes weight/volume names more readable
     * 
     * @example "Kilograms" => "One Kilogram"
     * @example "Red" => "Red"
     */
    formatOptionName(name: string): string {
        const formatMap: Record<string, string> = {
            'Kilograms': 'One Kilogram',
            'Grams': 'One Gram',
            'Tons': 'One Ton',
            'Pounds': 'One Pound',
            'Milliliters': 'One Milliliter',
            'Liters': 'One Liter',
            'Gallons': 'One Gallon',
        };

        return formatMap[name] || name;
    }

    /**
     * Validate SKU format
     * SKUs should be uppercase alphanumeric with hyphens
     * 
     * @example isValidSku("COLA-500ML-BTL") => true
     * @example isValidSku("cola 500ml") => false
     */
    isValidSku(sku: string): boolean {
        const skuRegex = /^[A-Z0-9][A-Z0-9-]*[A-Z0-9]$/;
        return skuRegex.test(sku) && sku.length >= 2 && sku.length <= 50;
    }

    /**
     * Sanitize SKU input from user
     * Remove invalid characters and uppercase
     * 
     * @example sanitizeSku("cola 500ml!") => "COLA500ML"
     */
    sanitizeSku(sku: string): string {
        return sku
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9-]/g, '');
    }
}

