import { Injectable, inject } from '@angular/core';
import { OptionItem } from '../components/option-selector.component';
import { SkuGeneratorService } from './sku-generator.service';

/**
 * Variant form structure
 * Note: name is auto-generated from options (shown to user but editable)
 */
export interface VariantForm {
    optionIds: string[]; // Array of option IDs (for combinations)
    name: string; // Customizable variant name
    sku: string;
    price: number;
    stockOnHand: number;
}

/**
 * Variant Generator Service
 * 
 * Responsible for generating product variants based on selected options.
 * Uses Cartesian product to create all possible combinations.
 * 
 * Example:
 * - Templates: Size (Small, Large) + Color (Red, Blue)
 * - Result: 4 variants (Small-Red, Small-Blue, Large-Red, Large-Blue)
 */
@Injectable({
    providedIn: 'root'
})
export class VariantGeneratorService {
    private readonly skuGenerator = inject(SkuGeneratorService);

    /**
     * Generate variants from selected options
     * Creates Cartesian product of options grouped by template
     * 
     * @param selectedOptions - Options selected by user
     * @param productPrefix - Product SKU prefix (e.g., "COLA")
     * @returns Array of variant forms ready for FormArray
     */
    generateVariants(
        selectedOptions: OptionItem[],
        productPrefix: string
    ): VariantForm[] {
        if (selectedOptions.length === 0) {
            return [];
        }

        // Group options by template
        const groupedOptions = this.groupOptionsByTemplate(selectedOptions);

        // Get all template groups as arrays
        const groups = Array.from(groupedOptions.values());

        // Generate Cartesian product (all combinations)
        const combinations = this.cartesianProduct(groups);

        // Create variant for each combination
        return combinations.map(combo => this.createVariantFromCombo(combo, productPrefix));
    }

    /**
     * Group selected options by their template
     * Example: Size options in one group, Color options in another
     */
    groupOptionsByTemplate(options: OptionItem[]): Map<string, OptionItem[]> {
        const grouped = new Map<string, OptionItem[]>();

        options.forEach(option => {
            const templateName = option.templateName || 'Custom';

            if (!grouped.has(templateName)) {
                grouped.set(templateName, []);
            }

            grouped.get(templateName)!.push(option);
        });

        return grouped;
    }

    /**
     * Generate Cartesian product of arrays
     * 
     * @example
     * cartesianProduct([[A, B], [1, 2]])
     * => [[A, 1], [A, 2], [B, 1], [B, 2]]
     */
    cartesianProduct<T>(arrays: T[][]): T[][] {
        if (arrays.length === 0) {
            return [[]];
        }

        if (arrays.length === 1) {
            return arrays[0].map(item => [item]);
        }

        const [first, ...rest] = arrays;
        const restProduct = this.cartesianProduct(rest);

        const result: T[][] = [];
        first.forEach(item => {
            restProduct.forEach(combo => {
                result.push([item, ...combo]);
            });
        });

        return result;
    }

    /**
     * Create a variant form object from a combination of options
     */
    private createVariantFromCombo(
        combo: OptionItem[],
        productPrefix: string
    ): VariantForm {
        const optionIds = combo.map(opt => opt.id);

        // Format names (e.g., "Kilograms" => "One Kilogram")
        const names = combo.map(opt =>
            this.skuGenerator.formatOptionName(opt.name)
        );

        // Generate SKU
        const sku = this.skuGenerator.generateVariantSku(productPrefix, combo);

        return {
            optionIds,
            name: names.join(' - '),
            sku,
            price: 0,
            stockOnHand: 0
        };
    }

    /**
     * Create a custom variant (no template/options)
     * Used when user manually adds a variant
     */
    createCustomVariant(
        productPrefix: string,
        customVariantCount: number
    ): VariantForm {
        return {
            optionIds: [],
            name: '',
            sku: this.skuGenerator.generateCustomSku(productPrefix, customVariantCount),
            price: 0,
            stockOnHand: 0
        };
    }

    /**
     * Get variant combination label for display
     * 
     * @example ["size-0", "color-1"] with options => "Small × Red"
     */
    getVariantCombinationLabel(
        optionIds: string[],
        availableOptions: OptionItem[]
    ): string {
        if (optionIds.length === 0) {
            return 'Custom';
        }

        const names = optionIds
            .map(id => availableOptions.find(opt => opt.id === id)?.name)
            .filter(Boolean);

        return names.join(' × ') || 'Unknown';
    }
}

