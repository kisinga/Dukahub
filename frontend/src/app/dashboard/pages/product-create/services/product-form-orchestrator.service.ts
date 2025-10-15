import { Injectable, effect, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CustomOption, TemplateStateService } from './template-state.service';
import { VariantFormStateService } from './variant-form-state.service';

/**
 * Product Form Orchestrator Service
 * 
 * Coordinates:
 * - Template state service
 * - Variant form state service
 * - Modal state management
 * - Form validation
 * 
 * Single Responsibility: Orchestration and coordination
 */
@Injectable()
export class ProductFormOrchestratorService {
    private readonly fb = inject(FormBuilder);
    readonly templateState = inject(TemplateStateService);
    readonly variantFormState = inject(VariantFormStateService);

    // Item type
    readonly itemType = signal<'product' | 'service'>('product');

    // Modal states
    readonly showCustomOptionModal = signal(false);
    readonly showAddOptionModal = signal(false);
    readonly showCombinationModal = signal(false);

    // Modal forms
    readonly customOptionForm = this.fb.group({
        name: ['', [Validators.required, Validators.minLength(2)]],
        values: ['', [Validators.required, Validators.minLength(3)]],
    });

    readonly addOptionForm = this.fb.group({
        variantGroup: ['Custom', [Validators.required]],
        value: ['', [Validators.required, Validators.minLength(1)]],
    });

    readonly combinationForm = this.fb.group({
        selectedOptionIds: [[] as string[], [Validators.required, Validators.minLength(2)]],
        name: ['', [Validators.required]],
        sku: ['', [Validators.required]],
        price: [0, [Validators.required, Validators.min(0.01)]],
        stockOnHand: [0, [Validators.required, Validators.min(0)]],
    });

    // Product name for SKU generation
    private readonly productNameSignal = signal('');

    /**
     * Set product name (for SKU generation)
     */
    setProductName(name: string): void {
        this.productNameSignal.set(name);
    }

    /**
     * Get product name
     */
    getProductName(): string {
        return this.productNameSignal();
    }

    /**
     * Initialize the orchestrator
     */
    constructor() {
        // Auto-sync: When selected options change, regenerate variants
        effect(() => {
            // Explicitly track these signals to ensure effect re-runs
            const selectedIds = this.templateState.selectedOptionIds();
            const availableOptions = this.templateState.availableOptions();
            const productName = this.productNameSignal();

            // Get selected options
            const selectedOptions = availableOptions.filter(opt => selectedIds.includes(opt.id));

            console.log('🔄 Effect triggered - selected options:', selectedOptions.length);

            // Regenerate variants when options change
            this.variantFormState.regenerateVariants(
                selectedOptions,
                this.generateProductPrefix(productName)
            );
        }, { allowSignalWrites: true });
    }

    /**
     * Toggle template
     */
    toggleTemplate(templateId: string): void {
        this.templateState.toggleTemplate(templateId);
    }

    /**
     * Toggle option selection
     */
    toggleOption(optionId: string): void {
        this.templateState.toggleOption(optionId);
    }

    /**
     * Clear all templates and variants
     */
    clearAll(): void {
        this.templateState.clearAll();
        this.variantFormState.clearAll();
    }

    // --- Custom Option Modal ---

    openCustomOptionModal(): void {
        this.customOptionForm.reset();
        this.showCustomOptionModal.set(true);
    }

    closeCustomOptionModal(): void {
        this.showCustomOptionModal.set(false);
        this.customOptionForm.reset();
    }

    /**
     * Add custom option type with multiple values
     */
    addCustomOption(): void {
        if (this.customOptionForm.invalid) {
            this.customOptionForm.markAllAsTouched();
            return;
        }

        const value = this.customOptionForm.value;
        const optionTypeName = value.name!.trim();
        const valuesText = value.values!.trim();

        // Parse multiple values (one per line)
        const values = valuesText
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        if (values.length === 0) {
            return;
        }

        const startIndex = this.templateState.customOptions().length;

        // Create custom options for each value
        const newOptions: CustomOption[] = values.map(valueName => ({
            name: valueName,
            sku: this.templateState.generateCustomSku(valueName),
            typeName: optionTypeName
        }));

        this.templateState.addCustomOptions(newOptions);

        // Auto-select all newly created options immediately
        this.templateState.autoSelectNewOptions(startIndex, newOptions.length);

        this.closeCustomOptionModal();

        // Scroll to SKU Details section after DOM update
        setTimeout(() => {
            this.scrollToSkuSection();
        }, 150);
    }

    // --- Add Option Value Modal ---

    openAddOptionValueModal(): void {
        this.addOptionForm.reset({ variantGroup: 'Custom' });
        this.showAddOptionModal.set(true);
    }

    closeAddOptionModal(): void {
        this.showAddOptionModal.set(false);
        this.addOptionForm.reset();
    }

    /**
     * Add single option value to a variant group
     */
    addOptionValue(): void {
        if (this.addOptionForm.invalid) {
            this.addOptionForm.markAllAsTouched();
            return;
        }

        const valueName = this.addOptionForm.value.value!.trim();
        const groupName = this.addOptionForm.value.variantGroup!.trim();
        const startIndex = this.templateState.customOptions().length;

        // Create option under selected group
        const newOption: CustomOption = {
            name: valueName,
            sku: this.templateState.generateCustomSku(valueName),
            typeName: groupName
        };

        this.templateState.addCustomOption(newOption);

        // Auto-select the new option immediately (synchronous to ensure effect triggers)
        const newOptionId = `custom-${startIndex}`;
        if (!this.templateState.isOptionSelected(newOptionId)) {
            this.templateState.toggleOption(newOptionId);
        }

        this.closeAddOptionModal();

        // Scroll after a brief delay to let DOM update
        setTimeout(() => {
            this.scrollToSkuSection();
        }, 150);
    }

    // --- Combination Modal (Hidden in KISS mode) ---

    openCombinationModal(): void {
        this.combinationForm.reset({
            selectedOptionIds: [],
            name: '',
            sku: '',
            price: 0,
            stockOnHand: 0
        });
        this.showCombinationModal.set(true);
    }

    closeCombinationModal(): void {
        this.showCombinationModal.set(false);
        this.combinationForm.reset();
    }

    // --- Utility Methods ---

    /**
     * Generate product prefix from name
     */
    private generateProductPrefix(productName: string): string {
        if (!productName?.trim()) {
            return 'PROD';
        }

        return productName
            .trim()
            .substring(0, 4)
            .toUpperCase()
            .replace(/\s/g, '')
            .replace(/[^A-Z0-9]/g, '');
    }

    /**
     * Scroll to SKU details section
     */
    private scrollToSkuSection(): void {
        setTimeout(() => {
            const skuSection = document.querySelector('[formArrayName="variants"]');
            if (skuSection) {
                skuSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 200);
    }

    /**
     * Add custom variant (no template)
     */
    addCustomVariant(): void {
        const productName = this.productNameSignal();
        const prefix = this.generateProductPrefix(productName);
        this.variantFormState.addCustomVariant(prefix);
        this.scrollToSkuSection();
    }

    /**
     * Switch item type (product/service)
     */
    switchItemType(type: 'product' | 'service'): void {
        this.itemType.set(type);
    }
}

