import { Injectable, computed, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OptionItem } from '../components/option-selector.component';
import { SkuGeneratorService } from './sku-generator.service';
import { VariantForm, VariantGeneratorService } from './variant-generator.service';

/**
 * Variant Form State Service
 * 
 * Manages:
 * - Variant FormArray creation and updates
 * - Variant regeneration based on option selection
 * - Custom variant creation
 * - Variant removal
 * 
 * Single Responsibility: Variant form array state management
 */
@Injectable()
export class VariantFormStateService {
    private readonly fb = inject(FormBuilder);
    private readonly skuGenerator = inject(SkuGeneratorService);
    private readonly variantGenerator = inject(VariantGeneratorService);

    // Variant FormArray (managed externally by main form)
    private variantsArray!: FormArray;

    /**
     * Initialize with parent form's variants array
     */
    initialize(variantsFormArray: FormArray): void {
        this.variantsArray = variantsFormArray;
    }

    /**
     * Get variants FormArray
     */
    getVariants(): FormArray {
        return this.variantsArray;
    }

    /**
     * Computed: Individual variants (1 option)
     */
    readonly individualVariants = computed(() => {
        if (!this.variantsArray) return [];

        return this.variantsArray.controls.filter(v => {
            const optionIds = v.get('optionIds')?.value || [];
            return optionIds.length === 1;
        }) as FormGroup[];
    });

    /**
     * Computed: Combined variants (2+ options)
     */
    readonly combinedVariants = computed(() => {
        if (!this.variantsArray) return [];

        return this.variantsArray.controls.filter(v => {
            const optionIds = v.get('optionIds')?.value || [];
            return optionIds.length > 1;
        }) as FormGroup[];
    });

    /**
     * Computed: Custom variants (no options)
     */
    readonly customVariants = computed(() => {
        if (!this.variantsArray) return [];

        return this.variantsArray.controls.filter(v => {
            const optionIds = v.get('optionIds')?.value || [];
            return optionIds.length === 0;
        }) as FormGroup[];
    });

    /**
     * Create variant FormGroup
     */
    createVariantForm(defaults?: Partial<VariantForm>): FormGroup {
        const formGroup = this.fb.group({
            optionIds: [defaults?.optionIds || [], [Validators.required, Validators.minLength(1)]],
            name: [defaults?.name || '', [Validators.required, Validators.minLength(1)]],
            sku: [
                defaults?.sku || '',
                [
                    Validators.required,
                    Validators.minLength(1),
                    Validators.maxLength(50),
                ],
            ],
            priceWithTax: [
                defaults?.price || 0,
                [Validators.required, Validators.min(0.01)],
            ],
            stockOnHand: [
                defaults?.stockOnHand || 0,
                [Validators.required, Validators.min(0)],
            ],
        });

        // Mark all fields as touched so validation shows immediately
        formGroup.markAllAsTouched();
        return formGroup;
    }

    /**
     * Regenerate variants based on selected options
     * Each option becomes its own individual variant (KISS approach)
     */
    regenerateVariants(
        selectedOptions: OptionItem[],
        productPrefix: string
    ): void {
        if (!this.variantsArray) return;

        const selectedIds = selectedOptions.map(opt => opt.id);

        if (selectedIds.length === 0) {
            this.variantsArray.clear();
            return;
        }

        // Remove individual variants that are no longer selected
        for (let i = this.variantsArray.length - 1; i >= 0; i--) {
            const variant = this.variantsArray.at(i);
            const optionIds = variant.get('optionIds')?.value || [];

            if (optionIds.length === 1 && !selectedIds.includes(optionIds[0])) {
                this.variantsArray.removeAt(i);
            }
        }

        // Create individual variants for newly selected options
        selectedOptions.forEach(option => {
            // Check if variant already exists
            const exists = this.variantsArray.controls.some(v => {
                const optionIds = v.get('optionIds')?.value || [];
                return optionIds.length === 1 && optionIds[0] === option.id;
            });

            if (!exists) {
                // Create new individual variant
                const name = this.skuGenerator.formatOptionName(option.name);
                const sku = this.skuGenerator.generateVariantSku(productPrefix, [option]);

                const variant: VariantForm = {
                    optionIds: [option.id],
                    name,
                    sku,
                    price: 0,
                    stockOnHand: 0
                };

                const formGroup = this.createVariantForm(variant);
                this.variantsArray.push(formGroup);

                // Trigger form validation update
                this.variantsArray.updateValueAndValidity();
            }
        });
    }

    /**
     * Add custom variant (no template/options)
     */
    addCustomVariant(productPrefix: string): void {
        if (!this.variantsArray) return;

        const customCount = this.customVariants().length + 1;
        const customVariant = this.variantGenerator.createCustomVariant(
            productPrefix,
            customCount
        );

        this.variantsArray.push(this.createVariantForm(customVariant));
    }

    /**
     * Remove variant by index
     */
    removeVariant(index: number): void {
        if (!this.variantsArray) return;
        this.variantsArray.removeAt(index);
    }

    /**
     * Get variant combination label
     */
    getVariantCombinationLabel(
        variantIndex: number,
        availableOptions: OptionItem[]
    ): string {
        if (!this.variantsArray) return 'Unknown';

        const variant = this.variantsArray.at(variantIndex);
        const optionIds = variant.get('optionIds')?.value || [];

        return this.variantGenerator.getVariantCombinationLabel(
            optionIds,
            availableOptions
        );
    }

    /**
     * Check if variant has custom options
     */
    variantHasCustomOptions(variantIndex: number): boolean {
        if (!this.variantsArray) return false;

        const variant = this.variantsArray.at(variantIndex);
        const optionIds = variant.get('optionIds')?.value || [];

        return optionIds.some((id: string) => id.startsWith('custom-'));
    }

    /**
     * Get combination labels for all variants
     */
    getAllCombinationLabels(availableOptions: OptionItem[]): string[] {
        if (!this.variantsArray) return [];

        const labels: string[] = [];
        for (let i = 0; i < this.variantsArray.length; i++) {
            labels.push(this.getVariantCombinationLabel(i, availableOptions));
        }
        return labels;
    }

    /**
     * Get custom variant indices
     */
    getCustomVariantIndices(): number[] {
        if (!this.variantsArray) return [];

        const indices: number[] = [];
        for (let i = 0; i < this.variantsArray.length; i++) {
            if (this.variantHasCustomOptions(i)) {
                indices.push(i);
            }
        }
        return indices;
    }

    /**
     * Clear all variants
     */
    clearAll(): void {
        if (this.variantsArray) {
            this.variantsArray.clear();
        }
    }

    /**
     * Get variant count
     */
    getVariantCount(): number {
        return this.variantsArray?.length || 0;
    }
}

